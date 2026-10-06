use serde::{Deserialize, Serialize};
use std::{
    fs, io,
    path::{Path, PathBuf},
};

pub const CURRENT_RUNTIME_SCHEMA: u32 = 1;
pub const SCHEMA_FILE: &str = "runtime-schema.json";

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RuntimeSchema {
    pub schema: u32,
    pub created_by: String,
    pub last_migrated_by: String,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
pub enum SchemaState {
    Missing,
    Ready,
    NewerThanApp,
    Invalid,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SchemaStatus {
    pub state: SchemaState,
    pub schema: Option<u32>,
}

pub fn schema_path(root: &Path) -> PathBuf {
    root.join(SCHEMA_FILE)
}

pub fn inspect_runtime_schema(root: &Path) -> SchemaStatus {
    let path = schema_path(root);
    if !path.is_file() {
        return SchemaStatus {
            state: SchemaState::Missing,
            schema: None,
        };
    }

    let Ok(raw) = fs::read_to_string(path) else {
        return SchemaStatus {
            state: SchemaState::Invalid,
            schema: None,
        };
    };
    let Ok(schema) = serde_json::from_str::<RuntimeSchema>(&raw) else {
        return SchemaStatus {
            state: SchemaState::Invalid,
            schema: None,
        };
    };

    let state = if schema.schema == CURRENT_RUNTIME_SCHEMA {
        SchemaState::Ready
    } else if schema.schema > CURRENT_RUNTIME_SCHEMA {
        SchemaState::NewerThanApp
    } else {
        SchemaState::Invalid
    };

    SchemaStatus {
        state,
        schema: Some(schema.schema),
    }
}

pub fn ensure_runtime_schema(root: &Path) -> io::Result<RuntimeSchema> {
    fs::create_dir_all(root)?;
    let path = schema_path(root);

    if path.is_file() {
        let raw = fs::read_to_string(&path)?;
        let schema: RuntimeSchema = serde_json::from_str(&raw).map_err(|error| {
            io::Error::new(
                io::ErrorKind::InvalidData,
                format!("invalid runtime schema {}: {error}", path.display()),
            )
        })?;

        if schema.schema > CURRENT_RUNTIME_SCHEMA {
            return Err(io::Error::new(
                io::ErrorKind::InvalidData,
                format!(
                    "runtime data schema {} is newer than this app supports ({})",
                    schema.schema, CURRENT_RUNTIME_SCHEMA
                ),
            ));
        }

        if schema.schema < CURRENT_RUNTIME_SCHEMA {
            return migrate_runtime_schema(root, schema);
        }

        return Ok(schema);
    }

    let version = env!("CARGO_PKG_VERSION").to_string();
    let schema = RuntimeSchema {
        schema: CURRENT_RUNTIME_SCHEMA,
        created_by: version.clone(),
        last_migrated_by: version,
    };
    write_schema_atomically(&path, &schema)?;
    Ok(schema)
}

fn migrate_runtime_schema(_root: &Path, schema: RuntimeSchema) -> io::Result<RuntimeSchema> {
    Err(io::Error::new(
        io::ErrorKind::InvalidData,
        format!("no migration exists from runtime schema {}", schema.schema),
    ))
}

fn write_schema_atomically(path: &Path, schema: &RuntimeSchema) -> io::Result<()> {
    let temporary = path.with_extension("json.tmp");
    let json = serde_json::to_string_pretty(schema)
        .map_err(|error| io::Error::new(io::ErrorKind::InvalidData, error))?;
    fs::write(&temporary, format!("{json}\n"))?;
    fs::rename(temporary, path)
}

#[cfg(test)]
mod tests {
    use super::{inspect_runtime_schema, SchemaState};
    use std::{fs, path::PathBuf};

    #[test]
    fn missing_schema_is_explicit() {
        let root = PathBuf::from("__virtual_clients_missing_schema_test__");
        let _ = fs::remove_dir_all(&root);
        let status = inspect_runtime_schema(&root);
        assert_eq!(status.state, SchemaState::Missing);
    }
}
