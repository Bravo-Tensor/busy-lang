# BUSY Lang Release Makefile

.PHONY: release-cli release-lsp bump-cli bump-lsp help

help:
	@echo "Version commands:"
	@echo "  make bump-cli          - Bump CLI patch version (0.1.2 → 0.1.3)"
	@echo "  make bump-cli MINOR=1  - Bump CLI minor version (0.1.2 → 0.2.0)"
	@echo "  make bump-lsp          - Bump LSP patch version"
	@echo "  make bump-lsp MINOR=1  - Bump LSP minor version"
	@echo ""
	@echo "Release commands:"
	@echo "  make release-cli       - Tag and push CLI release"
	@echo "  make release-lsp       - Tag and push LSP release"

# Bump CLI version
bump-cli:
	@cd packages/busy-cli && \
	if [ "$(MINOR)" = "1" ]; then \
		npm version minor --no-git-tag-version; \
	else \
		npm version patch --no-git-tag-version; \
	fi
	@npm install
	@VERSION=$$(node -p "require('./packages/busy-cli/package.json').version"); \
	git add packages/busy-cli/package.json package-lock.json && \
	git commit -m "Bump busy-cli to v$$VERSION" && \
	git push && \
	echo "✓ Bumped and pushed busy-cli v$$VERSION"

# Bump LSP version
bump-lsp:
	@cd packages/busy-lsp && \
	if [ "$(MINOR)" = "1" ]; then \
		npm version minor --no-git-tag-version; \
	else \
		npm version patch --no-git-tag-version; \
	fi
	@npm install
	@VERSION=$$(node -p "require('./packages/busy-lsp/package.json').version"); \
	git add packages/busy-lsp/package.json package-lock.json && \
	git commit -m "Bump busy-lsp to v$$VERSION" && \
	git push && \
	echo "✓ Bumped and pushed busy-lsp v$$VERSION"

# Release CLI (tag and push)
release-cli:
	@VERSION=$$(node -p "require('./packages/busy-cli/package.json').version"); \
	echo "Releasing CLI v$$VERSION"; \
	git tag "cli-v$$VERSION" && \
	git push origin "cli-v$$VERSION" && \
	echo "✓ Tagged and pushed cli-v$$VERSION"

# Release LSP (tag and push)
release-lsp:
	@VERSION=$$(node -p "require('./packages/busy-lsp/package.json').version"); \
	echo "Releasing LSP v$$VERSION"; \
	git tag "lsp-v$$VERSION" && \
	git push origin "lsp-v$$VERSION" && \
	echo "✓ Tagged and pushed lsp-v$$VERSION"
