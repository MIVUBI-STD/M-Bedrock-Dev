use serde::Serialize;

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
pub enum ClientId {
    Mce01,
    Mce02,
    Mce03,
    Mce04,
}

impl ClientId {
    pub const ALL: [Self; 4] = [Self::Mce01, Self::Mce02, Self::Mce03, Self::Mce04];

    pub fn as_str(self) -> &'static str {
        match self {
            Self::Mce01 => "MCE-01",
            Self::Mce02 => "MCE-02",
            Self::Mce03 => "MCE-03",
            Self::Mce04 => "MCE-04",
        }
    }

    pub fn is_native(self) -> bool {
        self == Self::Mce01
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
pub enum ClientState {
    Manual,
    NotProvisioned,
    Stopped,
    Starting,
    Ready,
    Error,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ClientStatus {
    pub id: &'static str,
    pub native: bool,
    pub state: ClientState,
}
