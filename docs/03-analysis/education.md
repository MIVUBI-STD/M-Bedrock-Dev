# Minecraft Education Capability Analysis

M-Bedrock-Dev uses one shared Bedrock/Education engine.

Minecraft Education is represented through target-edition and feature-capability profiles rather than a second parser or repair engine.

## Important distinction

The following are different facts:

- target product edition is Minecraft Education;
- a Bedrock world has Education Features enabled;
- world EDU level has a value;
- a pack manifest declares has_education_metadata.

Microsoft's Creator documentation exposes has_education_metadata as a manifest field, while Bedrock world settings separately expose Education Features and EDU Level. Therefore manifest metadata alone must not be treated as proof that the target world has Education features enabled. citeturn890966search2turn576723search0

## Profile

The compatibility layer derives:

```text
edition
educationFeatures = enabled | disabled | unknown
manifestEducationMetadata = true | false | unknown
eduLevel?
evidence[]
```

Minecraft Education edition can be treated as having the Education feature set, while retail Bedrock may also explicitly enable Education Features in world settings. citeturn576723search1turn576723search0

## Education capabilities

Chemistry is tracked as an Education feature-family capability rather than as ordinary Bedrock content. Microsoft's Education training documents tools such as the Element Constructor, Compound Creator, Lab Table, and Material Reducer as chemistry/science functionality in Minecraft Education. citeturn576723search5turn576723search7

Do not infer exact item/block identifiers or command availability solely from the feature-family rule.

## Diagnostics

If content requires Education features:

- enabled → no Education-state diagnostic;
- disabled → medium diagnostic;
- unknown → minor diagnostic.

This describes compatibility evidence, not runtime proof.
