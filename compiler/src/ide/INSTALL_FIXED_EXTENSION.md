# Fixed BUSY Language Server - Installation Guide

## Issues Fixed

✅ **Capability Resolution**: Language server now properly indexes capabilities from v2.0 team files  
✅ **Error Positioning**: Errors now show on correct lines instead of hardcoded positions  
✅ **Missing Definitions**: Added missing `communicate-with-servers` and other capabilities  
✅ **V2.0 Structure Support**: Updated indexing to handle flat capability/responsibility/resource structures  

## Installation Steps

1. **Uninstall Previous Version** (if installed):
   ```bash
   code --uninstall-extension busy-lang.busy-language-support
   ```

2. **Install Fixed Version**:
   ```bash
   code --install-extension busy-language-support-2.0.0.vsix
   ```

3. **Restart VS Code** to activate the new language server

4. **Test the Extension**:
   - Open `/examples/v2/kitchen-restaurant/L0/kitchen-operations/roles/expeditor.busy`
   - You should now see:
     - ✅ No errors on `communicate-with-servers` (it's now properly defined)
     - ✅ Accurate error positioning if you introduce typos
     - ✅ Hover tooltips showing capability definitions
     - ✅ Auto-completion for capability names

## Verification

The language server should now properly:
- Index capabilities from team files with flat v2.0 structure
- Show errors at correct line positions
- Provide hover information for defined capabilities
- Offer auto-completion for available capabilities and responsibilities

## Fixed Files

- `language-server.ts`: Updated indexing logic for v2.0 structure
- `team.busy`: Added missing capability and responsibility definitions
- Fixed capability resolution across team and role files