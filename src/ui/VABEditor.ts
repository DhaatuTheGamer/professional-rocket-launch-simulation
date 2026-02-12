/**
 * VAB Editor
 *
 * Visual vehicle builder UI with parts catalog, stacking area, and stage manager.
 */

import { RocketPart, PartCategory, PARTS_CATALOG, getPartsByCategory } from '../vab/PartsCatalog';
import {
    VehicleBlueprint,
    VehicleStats,
    createBlueprint,
    addStage,
    addPartToStage,
    removePartFromStage,
    removeStage,
    calculateStats,
    createFalconPreset,
    createSimplePreset,
    saveBlueprints,
    loadBlueprints
} from '../vab/VehicleBlueprint';

export class VABEditor {
    private container: HTMLElement;
    private blueprint: VehicleBlueprint;
    private savedBlueprints: VehicleBlueprint[] = [];
    private selectedCategory: PartCategory = 'engine';
    private onLaunch: (blueprint: VehicleBlueprint) => void;

    constructor(containerId: string, onLaunch: (blueprint: VehicleBlueprint) => void) {
        const container = document.getElementById(containerId);
        if (!container) throw new Error(`Container ${containerId} not found`);
        this.container = container;
        this.onLaunch = onLaunch;
        this.blueprint = createFalconPreset();
        this.savedBlueprints = loadBlueprints();
        this.render();
    }

    /**
     * Show the VAB editor
     */
    public show(): void {
        this.container.style.display = 'flex';
        this.render();
    }

    /**
     * Hide the VAB editor
     */
    public hide(): void {
        this.container.style.display = 'none';
    }

    /**
     * Get current blueprint
     */
    public getBlueprint(): VehicleBlueprint {
        return this.blueprint;
    }

    /**
     * Render the complete VAB UI
     */
    private render(): void {
        const stats = calculateStats(this.blueprint);

        this.container.innerHTML = `
            <div class="vab-editor">
                <div class="vab-header">
                    <h2>⚙️ Vehicle Assembly Building</h2>
                    <input type="text" class="vab-name-input" placeholder="Rocket Name">
                </div>
                
                <div class="vab-main">
                    <!-- Parts Catalog -->
                    <div class="vab-parts-panel">
                        <h3>Parts Catalog</h3>
                        <div class="vab-category-tabs">
                            ${this.renderCategoryTabs()}
                        </div>
                        <div class="vab-parts-list">
                            ${this.renderPartsList()}
                        </div>
                    </div>
                    
                    <!-- Vehicle Preview -->
                    <div class="vab-preview-panel">
                        <h3>Vehicle Preview</h3>
                        <div class="vab-vehicle-display">
                            ${this.renderVehiclePreview()}
                        </div>
                    </div>
                    
                    <!-- Stage Manager -->
                    <div class="vab-stages-panel">
                        <h3>Stages</h3>
                        <div class="vab-stages-list">
                            ${this.renderStagesList()}
                        </div>
                        <button class="vab-add-stage-btn">+ Add Stage</button>
                    </div>
                </div>
                
                <!-- Stats Bar -->
                <div class="vab-stats-bar">
                    ${this.renderStats(stats)}
                </div>
                
                <!-- Action Buttons -->
                <div class="vab-actions">
                    <div class="vab-presets">
                        <button class="vab-preset-btn" data-preset="falcon">Load Falcon 9</button>
                        <button class="vab-preset-btn" data-preset="simple">Load Simple</button>
                        <button class="vab-preset-btn" data-preset="new">New Rocket</button>
                    </div>
                    <div class="vab-main-actions">
                        <button class="vab-save-btn">💾 Save</button>
                        <button class="vab-cancel-btn">Cancel</button>
                        <button class="vab-launch-btn primary large">🚀 GO FOR LAUNCH</button>
                    </div>
                </div>
            </div>
        `;

        // Safely set user input value to prevent XSS
        const nameInput = this.container.querySelector('.vab-name-input') as HTMLInputElement;
        if (nameInput) {
            nameInput.value = this.blueprint.name;
        }

        this.attachEventListeners();
    }

    /**
     * Render category tabs
     */
    private renderCategoryTabs(): string {
        const categories: { id: PartCategory; icon: string; label: string }[] = [
            { id: 'engine', icon: '🔥', label: 'Engines' },
            { id: 'tank', icon: '⛽', label: 'Tanks' },
            { id: 'avionics', icon: '🎛️', label: 'Avionics' },
            { id: 'fairing', icon: '🛡️', label: 'Fairings' },
            { id: 'decoupler', icon: '⚡', label: 'Decouplers' },
            { id: 'srb', icon: '🚀', label: 'SRBs' }
        ];

        return categories
            .map(
                (cat) => `
            <button class="vab-cat-tab ${this.selectedCategory === cat.id ? 'active' : ''}"
                    data-category="${cat.id}">
                ${cat.icon} ${cat.label}
            </button>
        `
            )
            .join('');
    }

    /**
     * Render parts list for selected category
     */
    private renderPartsList(): string {
        const parts = getPartsByCategory(this.selectedCategory);

        if (parts.length === 0) {
            return '<div class="vab-no-parts">No parts in this category</div>';
        }

        return parts
            .map(
                (part) => `
            <div class="vab-part-item" data-part-id="${part.id}">
                <div class="vab-part-icon">${this.getPartIcon(part)}</div>
                <div class="vab-part-info">
                    <div class="vab-part-name">${part.name}</div>
                    <div class="vab-part-desc">${part.description}</div>
                    <div class="vab-part-stats">
                        ${this.formatPartStats(part)}
                    </div>
                </div>
                <div class="vab-part-cost">$${part.cost}</div>
            </div>
        `
            )
            .join('');
    }

    /**
     * Get icon for part category
     */
    private getPartIcon(part: RocketPart): string {
        switch (part.category) {
            case 'engine':
                return '🔥';
            case 'tank':
                return '⛽';
            case 'avionics':
                return '🎛️';
            case 'fairing':
                return '🛡️';
            case 'decoupler':
                return '⚡';
            case 'srb':
                return '🚀';
            default:
                return '📦';
        }
    }

    /**
     * Format part stats for display
     */
    private formatPartStats(part: RocketPart): string {
        const stats: string[] = [`${part.mass}kg`];

        if (part.thrust) {
            stats.push(`${(part.thrust / 1000).toFixed(0)}kN`);
        }
        if (part.ispVac) {
            stats.push(`${part.ispVac}s Isp`);
        }
        if (part.fuelCapacity) {
            stats.push(`${(part.fuelCapacity / 1000).toFixed(1)}t fuel`);
        }

        return stats.join(' | ');
    }

    /**
     * Render vehicle preview
     */
    private renderVehiclePreview(): string {
        if (this.blueprint.stages.length === 0) {
            return '<div class="vab-empty-vehicle">Add stages and parts to build your rocket</div>';
        }

        // Build visual representation from top to bottom
        let html = '';
        for (let i = this.blueprint.stages.length - 1; i >= 0; i--) {
            const stage = this.blueprint.stages[i];
            if (!stage) continue;

            html += `<div class="vab-stage-preview" data-stage="${i}">`;

            // Render parts in stage (top to bottom in visual order)
            for (let j = stage.parts.length - 1; j >= 0; j--) {
                const inst = stage.parts[j];
                if (!inst) continue;
                html += `
                    <div class="vab-part-preview" 
                         data-instance="${inst.instanceId}"
                         style="height: ${inst.part.height}px; width: ${inst.part.width}px;">
                        <span class="part-label">${inst.part.name}</span>
                        <button class="remove-part" data-stage="${i}" data-instance="${inst.instanceId}">×</button>
                    </div>
                `;
            }

            // Show decoupler if present
            if (stage.hasDecoupler && i > 0) {
                html += '<div class="vab-decoupler-marker">⚡ STAGE SEP</div>';
            }

            html += '</div>';
        }

        return html;
    }

    /**
     * Render stages list
     */
    private renderStagesList(): string {
        if (this.blueprint.stages.length === 0) {
            return '<div class="vab-no-stages">No stages yet. Click "Add Stage" to begin.</div>';
        }

        return this.blueprint.stages
            .map((stage, i) => {
                const stageStats = this.getStageStats(stage);
                return `
                <div class="vab-stage-item ${i === 0 ? 'first-stage' : ''}" data-stage="${i}">
                    <div class="vab-stage-header">
                        <span class="stage-number">Stage ${i + 1}</span>
                        <span class="stage-info">${stage.parts.length} parts</span>
                        ${i > 0 ? '<button class="remove-stage" data-stage="' + i + '">🗑️</button>' : ''}
                    </div>
                    <div class="vab-stage-stats">
                        <span>Mass: ${(stageStats.mass / 1000).toFixed(1)}t</span>
                        <span>ΔV: ${stageStats.deltaV.toFixed(0)} m/s</span>
                    </div>
                    <button class="vab-add-to-stage" data-stage="${i}">+ Add Selected Part</button>
                </div>
            `;
            })
            .join('');
    }

    /**
     * Get simple stats for a single stage
     */
    private getStageStats(stage: any): { mass: number; deltaV: number } {
        let mass = 0;
        let fuel = 0;
        let isp = 0;
        let engineCount = 0;

        for (const inst of stage.parts) {
            mass += inst.part.mass;
            if (inst.part.fuelCapacity) {
                fuel += inst.part.fuelCapacity;
                mass += inst.part.fuelCapacity;
            }
            if (inst.part.ispVac) {
                isp += inst.part.ispVac;
                engineCount++;
            }
        }

        if (engineCount > 0) isp /= engineCount;

        const m0 = mass;
        const mf = mass - fuel;
        const deltaV = isp > 0 && mf > 0 && m0 > mf ? isp * 9.81 * Math.log(m0 / mf) : 0;

        return { mass, deltaV };
    }

    /**
     * Render stats bar
     */
    private renderStats(stats: VehicleStats): string {
        const twr = stats.stageTWR[0] || 0;
        const twrClass = twr > 1.2 ? 'good' : twr > 1.0 ? 'warning' : 'bad';
        const dvClass = stats.totalDeltaV > 9000 ? 'good' : stats.totalDeltaV > 5000 ? 'warning' : 'bad';

        return `
            <div class="vab-stat">
                <div class="vab-stat-label">Total Mass</div>
                <div class="vab-stat-value">${(stats.wetMass / 1000).toFixed(1)}</div>
                <div class="vab-stat-unit">tons</div>
            </div>
            <div class="vab-stat">
                <div class="vab-stat-label">Total ΔV</div>
                <div class="vab-stat-value ${dvClass}">${stats.totalDeltaV.toFixed(0)}</div>
                <div class="vab-stat-unit">m/s</div>
            </div>
            <div class="vab-stat">
                <div class="vab-stat-label">TWR (Stage 1)</div>
                <div class="vab-stat-value ${twrClass}">${twr.toFixed(2)}</div>
                <div class="vab-stat-unit">ratio</div>
            </div>
            <div class="vab-stat">
                <div class="vab-stat-label">Stages</div>
                <div class="vab-stat-value">${this.blueprint.stages.length}</div>
                <div class="vab-stat-unit">count</div>
            </div>
            <div class="vab-stat">
                <div class="vab-stat-label">Total Cost</div>
                <div class="vab-stat-value">${stats.totalCost.toLocaleString()}</div>
                <div class="vab-stat-unit">credits</div>
            </div>
            <div class="vab-stat">
                <div class="vab-stat-indicator ${stats.hasAvionics ? 'ok' : 'warn'}">
                    ${stats.hasAvionics ? '✓' : '⚠'} Avionics
                </div>
                <div class="vab-stat-indicator ${stats.hasFairing ? 'ok' : 'warn'}">
                    ${stats.hasFairing ? '✓' : '⚠'} Fairing
                </div>
            </div>
        `;
    }

    /**
     * Attach event listeners
     */
    private attachEventListeners(): void {
        // Category tabs
        this.container.querySelectorAll('.vab-cat-tab').forEach((btn) => {
            btn.addEventListener('click', (e) => {
                const target = e.currentTarget as HTMLElement;
                this.selectedCategory = target.dataset.category as PartCategory;
                this.render();
            });
        });

        // Part items (select part)
        this.container.querySelectorAll('.vab-part-item').forEach((item) => {
            item.addEventListener('click', (e) => {
                // Toggle selection
                this.container.querySelectorAll('.vab-part-item').forEach((i) => i.classList.remove('selected'));
                (e.currentTarget as HTMLElement).classList.add('selected');
            });
        });

        // Add to stage buttons
        this.container.querySelectorAll('.vab-add-to-stage').forEach((btn) => {
            btn.addEventListener('click', (e) => {
                const stageIndex = parseInt((e.currentTarget as HTMLElement).dataset.stage || '0');
                const selectedPart = this.container.querySelector('.vab-part-item.selected');
                if (selectedPart) {
                    const partId = (selectedPart as HTMLElement).dataset.partId;
                    const part = PARTS_CATALOG.find((p) => p.id === partId);
                    if (part) {
                        this.blueprint = addPartToStage(this.blueprint, stageIndex, part);
                        this.render();
                    }
                }
            });
        });

        // Remove part buttons
        this.container.querySelectorAll('.remove-part').forEach((btn) => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const target = e.currentTarget as HTMLElement;
                const stageIndex = parseInt(target.dataset.stage || '0');
                const instanceId = target.dataset.instance || '';
                this.blueprint = removePartFromStage(this.blueprint, stageIndex, instanceId);
                this.render();
            });
        });

        // Add stage button
        this.container.querySelector('.vab-add-stage-btn')?.addEventListener('click', () => {
            this.blueprint = addStage(this.blueprint);
            this.render();
        });

        // Remove stage buttons
        this.container.querySelectorAll('.remove-stage').forEach((btn) => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const stageIndex = parseInt((e.currentTarget as HTMLElement).dataset.stage || '0');
                this.blueprint = removeStage(this.blueprint, stageIndex);
                this.render();
            });
        });

        // Preset buttons
        this.container.querySelectorAll('.vab-preset-btn').forEach((btn) => {
            btn.addEventListener('click', (e) => {
                const preset = (e.currentTarget as HTMLElement).dataset.preset;
                switch (preset) {
                    case 'falcon':
                        this.blueprint = createFalconPreset();
                        break;
                    case 'simple':
                        this.blueprint = createSimplePreset();
                        break;
                    case 'new':
                        this.blueprint = createBlueprint('New Rocket');
                        this.blueprint = addStage(this.blueprint);
                        break;
                }
                this.render();
            });
        });

        // Name input
        this.container.querySelector('.vab-name-input')?.addEventListener('change', (e) => {
            this.blueprint.name = (e.target as HTMLInputElement).value;
        });

        // Save button
        this.container.querySelector('.vab-save-btn')?.addEventListener('click', () => {
            // Update or add to saved blueprints
            const existing = this.savedBlueprints.findIndex((b) => b.id === this.blueprint.id);
            if (existing >= 0) {
                this.savedBlueprints[existing] = this.blueprint;
            } else {
                this.savedBlueprints.push(this.blueprint);
            }
            saveBlueprints(this.savedBlueprints);
            alert('Blueprint saved!');
        });

        // Cancel button
        this.container.querySelector('.vab-cancel-btn')?.addEventListener('click', () => {
            this.hide();
        });

        // Launch button
        this.container.querySelector('.vab-launch-btn')?.addEventListener('click', () => {
            const stats = calculateStats(this.blueprint);
            if (this.blueprint.stages.length === 0 || (stats.stageTWR[0] || 0) < 1.0) {
                alert('Vehicle not ready! Ensure you have stages and TWR > 1.0');
                return;
            }
            this.hide();
            this.onLaunch(this.blueprint);
        });
    }
}
