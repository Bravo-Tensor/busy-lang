---
Name: View
Type: [Document]
Description: A presentation [Document] that composes and displays information from [Model]s and [Playbook]s. Follows MVC — imports provide the data, local definitions shape the view model, the display section renders the layout, and operations handle actions.
---

# [Imports](./document.busy.md#imports-section)

[View]:./view.busy.md
[Document]:./document.busy.md
[Model]:./model.busy.md
[Config]:./config.busy.md
[Playbook]:./playbook.busy.md
[Operation]:./operation.busy.md
[Tool]:./tool.busy.md
[Input]:./operation.busy.md#input
[Output]:./operation.busy.md#output
[Steps]:./operation.busy.md#steps
[Input Section]:./operation.busy.md#input-section
[Output Section]:./operation.busy.md#output-section
[Steps Section]:./operation.busy.md#steps-section
[Checklist Section]:./checklist.busy.md#checklist-section

# [Setup](./document.busy.md#setup-section)

A [View] presents information from the domain in a format optimized for consumption — whether by humans or LLM agents. Unlike a [Model] which defines what data exists, or a [Playbook] which defines how work is done, a [View] defines how information is displayed and interacted with.

Views follow a Model-View-Controller pattern:
- **Imports** bring in [Model]s and [Playbook]s as data sources
- **Local Definitions** reshape and combine imported data into a view model
- **Display** section defines the layout and presentation (optional — a compiler can generate a default from the view model)
- **Operations** handle actions the user can take (refresh, filter, navigate)

A [View] with a Display section is renderable — a LORE compiler can compile it into a navigable page. A [View] without a Display section is a data composition only.

## Authoring Guidance

- A renderable [View] is a **page**, not a runtime data source.
- Imported [View]s should be treated as navigation or composition relationships unless a compiler/runtime explicitly defines another derived-data mechanism.
- Runtime data loading should normally come from imported [Model]s, [Config]s, or other explicit persisted sources.
- [Local Definitions] shape imported data into the page's view model; they do not by themselves imply routes or persistence.
- Keep the [Display Section] readable as markdown on its own. Inline links may appear in the body without necessarily becoming promoted page actions.
- Put meaningful user actions in [Operations]; do not assume every inline link will become an explicit runtime action affordance.
- Links to non-renderable documents should be treated as references unless promoted by compiler/runtime rules.

### Page Views and Component Views

A [View] may be authored as either a **page view** or a **component view**.

- **Page view** — route-bound, owns data loading and page composition. It imports [Model]s and [Config]s as data sources and may embed component views inside its [Display Section].
- **Component view** — embeddable and presentational. It receives data from a parent page view as params and should avoid doing its own data loading.

Component views declare expected params in frontmatter:

```yaml
Params:
  - prospect: object (required)
  - show_pricing: boolean
```

A page view may embed a component view using an import link with query-string params:

```markdown
[Status Card]:../components/status-card.busy.md?prospect={{prospect}}
```

This keeps data ownership at the page level while allowing reusable display fragments.

# [Local Definitions](./document.busy.md#local-definitions-section)

## [Data Source]
[Data Source]:./view.busy.md#data-source
A reference to an imported [Model], [Config], or other explicit persisted source that provides data for this view. Each data source maps imported fields to the view model. Imported renderable [View]s are page/composition references, not runtime data sources by default.

## [View Model Field]
[View Model Field]:./view.busy.md#view-model-field
A field in the view model, derived from one or more [Data Source]s. Can be:
- **Direct mapping**: field comes straight from a [Model] field
- **Computed**: derived from multiple fields or logic (e.g., days since a date)
- **Aggregated**: summarized across multiple instances (e.g., count, average)

## [Filter]
[Filter]:./view.busy.md#filter
A constraint that narrows which [Model] instances are included in the view. Filters can be static (defined in the view) or dynamic (set by user actions via operations).

## [Display Section]
[Display Section]:./view.busy.md#display-section
The presentation layout written in markdown. May include Handlebars-style placeholders (`{{field}}`, `{{#each items}}`, `{{#if condition}}`) that are resolved against the view model at render time. This section is optional — when omitted, a compiler can generate a default layout from the local definitions.

# [Operations](./document.busy.md#operations-section)

## [renderView](./operation.busy.md)

Compile and render this view using current data.

### [Input][Input Section]
- `data_sources`: Loaded [Model] instances from imports
- `filters`: Active [Filter] constraints (optional)

### [Steps][Steps Section]
1. Load data from each [Data Source] via the configured persistence adapter or runtime loader
2. Apply any active [Filter]s to narrow the data set
3. Map loaded data to [View Model Field]s defined in local definitions
4. Resolve any page/reference relationships to other renderable [View]s separately from data loading
5. If [Display Section] exists, resolve placeholders against the view model
6. If no [Display Section], generate a default layout from view model fields
7. Return rendered output

### [Output][Output Section]
- Rendered view content (markdown, HTML, or text depending on compiler)

### [Checklist][Checklist Section]
- All data sources loaded
- Filters applied
- View model fields resolved
- Display rendered or generated

## [refreshView](./operation.busy.md)

Reload data from sources and re-render.

### [Input][Input Section]
- `force`: Whether to bypass cache (optional, default false)

### [Steps][Steps Section]
1. Reload all [Data Source]s from their persistence adapters or runtime loaders
2. Re-resolve any page/reference relationships needed for navigation
3. Re-run renderView with fresh data

### [Output][Output Section]
- Updated rendered view content

### [Checklist][Checklist Section]
- Data sources refreshed
- View re-rendered with current data
