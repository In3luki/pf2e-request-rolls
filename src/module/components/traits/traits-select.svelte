<script lang="ts">
    import Svelecte from "svelecte";

    interface TraitsProps {
        closeAfterSelect?: boolean;
        clearable?: boolean;
        creatable?: boolean;
        multiple?: boolean;
        options: { label: string; value: string }[];
        placeholder?: string;
        value?: string[];
        onChange?: (selection: { label: string; value: string }[]) => void;
    }

    interface SvelecteI18n {
        empty: string;
        nomatch: string;
        max: (max: number) => string;
        fetchBefore: string;
        fetchQuery: (minQuery: number, inputLength: number) => string;
        fetchInit: string;
        fetchEmpty: string;
        collapsedSelection: (count: number) => string;
        createRowLabel: (value: string) => string;
        aria_selected: (opts: string[]) => string;
        aria_listActive: (opt: string, labelField: string, resultCount: number) => string;
        aria_inputFocused: () => string;
        aria_label: string;
        aria_describedby: string;
    }

    const props: TraitsProps = $props();
    const i18n: Partial<SvelecteI18n> = {
        empty: game.i18n.localize("PF2E.CompendiumBrowser.TraitsComponent.Empty"),
        nomatch: game.i18n.localize("PF2E.CompendiumBrowser.TraitsComponent.NoMatch"),
    };

    // Svelecte position resolver that puts it on the body
    function positionResolver(node: HTMLElement) {
        // Add classes to element, including theme
        const themed = node.closest(".themed, body");
        const theme = [...(themed?.classList ?? [])].find((c) => c.startsWith("theme-"));
        node.classList.add("detached", "pf2e");
        if (theme) {
            node.classList.add("themed", theme);
        }

        let destroyed = false;
        const selectElement = node.parentElement;

        function positionElement() {
            if (destroyed) return; // end the request animation loop if destroyed

            if (selectElement && node.classList.contains("is-open")) {
                const bounds = selectElement.getBoundingClientRect();
                node.style.left = `${bounds.left}px`;
                node.style.top = `${bounds.bottom}px`;
                node.style.minWidth = `${bounds.width}px`;
            }

            requestAnimationFrame(positionElement);
        }

        document.body.appendChild(node);
        positionElement();

        return {
            destroy: () => {
                destroyed = false;
                selectElement?.appendChild(node);
            },
        };
    }
</script>

<div class="traits-select">
    <Svelecte {...props} class="request-rolls" {i18n} {positionResolver} />
</div>

<style lang="scss">
    .traits-select {
        display: flex;
        margin-bottom: 0.25em;
    }

    :global {
        .svelecte.request-rolls,
        .sv_dropdown.request-rolls {
            /** Svelecte Colors */
            --sv-color: var(--color-dark-1);
            --sv-item-btn-color: var(--color-text-trait);
            --sv-item-btn-color-hover: var(--color-text-trait);
            --sv-control-bg: rgba(0, 0, 0, 0.1);
            --sv-icon-color: var(--color-dark-6);
            --sv-item-selected-bg: var(--color-bg-trait);
            --sv-item-btn-bg: var(--color-bg-trait);

            --sv-selection-multi-wrap-padding: 0.15em;
            --sv-selection-gap: 0.2em;
            --sv-min-height: 2rem; /* match var(--input-height), which is not exposed */

            .sv-input--text {
                width: auto;
                height: unset;
                line-height: unset;
                padding: 0 0.25em;
                background: none;
                border: none;
                border-radius: unset;
                outline: unset;
                color: var(--input-text-color);
                user-select: unset;
                font-size: unset;
                transition: unset;

                &:focus {
                    box-shadow: none;
                    outline: unset;
                }
            }

            /** Undo foundry overrides */
            button {
                height: unset;
                min-height: unset;
                border-radius: unset;
            }
        }

        body.theme-dark .application:not(.themed) .svelecte.request-rolls,
        .themed.theme-dark .svelecte.request-rolls,
        .themed.theme-dark.sv_dropdown.request-rolls {
            --sv-color: var(--color-light-3);
            --sv-control-bg: var(--color-cool-4);
            --sv-icon-color: var(--color-light-3);
            --sv-dropdown-bg: var(--color-dark-2);
            --sv-dropdown-active-bg: #553d3d;
        }

        body > .sv_dropdown.request-rolls.detached {
            min-width: 0;
            z-index: 5000 !important;
        }
    }
</style>
