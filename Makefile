# BUSY Lang Release Makefile

.PHONY: release-cli release-lsp help

help:
	@echo "Release commands:"
	@echo "  make release-cli   - Tag and push CLI release (reads version from package.json)"
	@echo "  make release-lsp   - Tag and push LSP release (reads version from package.json)"

release-cli:
	@VERSION=$$(node -p "require('./packages/busy-cli/package.json').version"); \
	echo "Releasing CLI v$$VERSION"; \
	git tag "cli-v$$VERSION" && \
	git push origin "cli-v$$VERSION" && \
	echo "✓ Tagged and pushed cli-v$$VERSION"

release-lsp:
	@VERSION=$$(node -p "require('./packages/busy-lsp/package.json').version"); \
	echo "Releasing LSP v$$VERSION"; \
	git tag "lsp-v$$VERSION" && \
	git push origin "lsp-v$$VERSION" && \
	echo "✓ Tagged and pushed lsp-v$$VERSION"
