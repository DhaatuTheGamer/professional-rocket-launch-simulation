import { FlightComputer } from '../guidance/FlightComputer';

/**
 * Updates the Flight Computer HUD element with current status and commands.
 * Uses secure DOM methods to prevent XSS vulnerabilities.
 *
 * @param fcStatus The container element for the HUD
 * @param flightComputer The FlightComputer instance
 */
export function updateFlightComputerHUD(fcStatus: HTMLElement, flightComputer: FlightComputer): void {
    if (!fcStatus) return;

    const isActive = flightComputer.isActive();
    const isStandby = flightComputer.state.mode !== 'OFF';

    if (isActive || isStandby) {
        fcStatus.classList.add('active');

        let modeDiv = fcStatus.querySelector('.fc-mode');
        if (!modeDiv) {
            modeDiv = document.createElement('div');
            modeDiv.className = 'fc-mode';
            fcStatus.appendChild(modeDiv);
        }
        modeDiv.textContent = flightComputer.getStatusString();

        let commandDiv = fcStatus.querySelector('.fc-command');
        if (isActive) {
            if (!commandDiv) {
                commandDiv = document.createElement('div');
                commandDiv.className = 'fc-command';
                fcStatus.appendChild(commandDiv);
            }
            commandDiv.textContent = flightComputer.getActiveCommandText();
        } else {
            if (commandDiv) {
                commandDiv.remove();
            }
        }
    } else {
        fcStatus.classList.remove('active');
        fcStatus.textContent = '';
    }
}
