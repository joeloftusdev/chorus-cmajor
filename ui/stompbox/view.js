

/**
 * @typedef {Object} Parameter
 * @property {number} min 
 * @property {number} max
 * @property {number} initialValue 
 * @property {() => void} onBeginEdit
 * @property {(value: number) => void} onEdit
 * @property {() => void} onEndEdit
 * @property {(listener: (value: number) => void) => RemoveListenerFn} subscribe 
*/

/**
 * {@link Parameter.subscribe}
 * @typedef {() => void} RemoveListenerFn
 * */

/**
 * @param {Object} parameters
 * 
 * @param {Parameter} parameters.rate 
 * @param {Parameter} parameters.shape 
 * @param {Parameter} parameters.depth 
 * @param {Object} [options]
 * @param {boolean} [options.controlled] 
 * @return {HTMLElement} 
 */
export function createView (parameters, options)
{
    const customElementName = "cmaj-adc-2023-tremolo-view";

    if (! window.customElements.get (customElementName))
        window.customElements.define (customElementName, PatchView);

    return new PatchView (parameters, options);
}


class PatchView extends HTMLElement
{
    constructor (parameters = {}, { controlled = true } = {})
    {
        super();

        const shadow = this.attachShadow ({ mode: "closed" });

        const setupKnob = (elementId, config) =>
        {
            return makeRotatable ({
                ...config,
                element: shadow.getElementById (elementId),
                maxRotation: 140,
                controlled,
            });
        };

       const setupSwitch = (config)  =>
        {
            const ledElement = shadow.getElementById ("power-led");

            const setLedActive = (active) =>
            {
                ledElement.classList.remove (! active ? "led-on" : "led-off");
                ledElement.classList.add (active ? "led-on" : "led-off");
            };

            const negateArgument = (fn) => (value) => fn (! value);

            const update = makeSwitchable ({
                onValueUpdated: negateArgument (setLedActive),
                element: shadow.getElementById ("stomp-switch"),
                ...config,
                controlled,
            });

            const toBool = (v) => !! v;

            return (nextValue) => update (toBool (nextValue));
        };


        this.connectedCallbackImpl = () =>
        {
            shadow.innerHTML = getHTML();

            const subscriptions = [];

            const setupAndSubscribe = (parameter, setup) =>
            {
                const update = setup (parameter);

                const unsubscribe = parameter?.subscribe?.(update);

                if (unsubscribe)
                    subscriptions.push (unsubscribe);
            };

            setupAndSubscribe (parameters.bypass, (parameter) => setupSwitch (parameter));
            setupAndSubscribe (parameters.wave, (parameter) => setupKnob ("knob-shape", parameter));
            setupAndSubscribe (parameters.rate, (parameter) => setupKnob ("knob-rate", parameter));
            setupAndSubscribe (parameters.depth, (parameter) => setupKnob ("knob-depth", parameter));


            this.disconnectedCallbackImpl = () =>
            {
                subscriptions.forEach ((unsubscribe) => unsubscribe?.());
                subscriptions.length = 0;
            };
        };
    }

    connectedCallback()
    {
        this.connectedCallbackImpl?.();
    }

    disconnectedCallback()
    {
        this.disconnectedCallbackImpl?.();
    }
}

function resolvePath (path)
{
    return new URL (path, import.meta.url);
}

function getHTML()
{
    return `
<style>
* {
    user-select: none;
    -webkit-user-select: none;
    -moz-user-select: none;
    -ms-user-select: none;
}

.enclosure-png {
    width: 250px;
    height: 423px;

    background-image: url(${resolvePath ("./enclosure.png")});
}

.big-knob-svg {
    width: 68px;
    height: 68px;

    background-image: url(${resolvePath ("./big-knob-flat.svg")});
}

.smaller-knob-svg {
    width: 48px;
    height: 48px;

    background-image: url(${resolvePath ("./smaller-knob-flat.svg")});
}

.controls {
    position: absolute;
    left: 25px;
    top: 12px;
}

.slot-offset {
    position: relative;
    margin-left: 10px;
    height: 100%;
}

.rectangular-button-svg {
    width: 216px;
    height: 145px;

    background-image: url(${resolvePath ("./button.svg")});

    display: flex;
    align-items: center;
    justify-content: center;
}

#power-led {
    position: absolute;
    left: 110px;
    top: 20px;
}

#knob-rate {
    position: absolute;
    top: 5px;
}

#knob-depth {
    position: absolute;
    top: 5px;
    left: 111px;
}

#knob-shape {
    position: absolute;
    left: 66px;
    top: 78px;
}



#stomp-switch {
    position: absolute;
    left: 7px;
    bottom: 8px;
}

.led {
    display: flex;
    align-items: center;
    justify-content: center;

    border-radius: 50%;
    width: 10px;
    height: 10px;

    box-shadow: inset 1px 1px 2px rgba(0, 0, 0, 0.4);
}

.led-reflection {
    border-radius: 50%;

    clip-path: path("M6.00001 1.66622C5.54611 1.4185 5.02548 1.27771 4.47196 1.27771C2.70782 1.27771 1.2777 2.70783 1.2777 4.47196C1.2777 5.02548 1.41849 5.5461 1.6662 6C0.673474 5.45819 0 4.40487 0 3.19425C0 1.43012 1.43012 0 3.19425 0C4.40488 0 5.45821 0.673483 6.00001 1.66622Z");

    background: rgba(255, 255, 255, 0.5);
    width: 6px;
    height: 6px;
}

.led-on {
    background: rgba(255, 0, 0, 1.0);
}

.led-off {
    background: rgba(255, 0, 0, 0.5);
}
</style>

<div class="enclosure-png">
    <div class="slot-offset">
        <div id="power-led" class="led led-off">
            <div class="led-reflection"></div>
        </div>
        <div class="controls">
            <div id="knob-rate" class="big-knob-svg"></div>
            <div id="knob-depth" class="big-knob-svg"></div>
            <div id="knob-shape" class="smaller-knob-svg"></div>
        </div>
        <div id="stomp-switch" class="rectangular-button-svg">
          
        </div>
    </div>
</div>
    `;
}

function makeRotatable ({
    initialValue,
    min = 0,
    max = 1,
    onBeginEdit = () => {},
    onEdit = () => {},
    onEndEdit = () => {},
    maxRotation = 132,
    element,
    controlled = true,
} = {})
{
    initialValue = initialValue ?? min;

    const remap = (source, sourceFrom, sourceTo, targetFrom, targetTo) =>
    {
        return targetFrom + (source - sourceFrom) * (targetTo - targetFrom) / (sourceTo - sourceFrom);
    };

    const toValue = (knobRotation) => remap (knobRotation, -maxRotation, maxRotation, min, max);
    const toRotation = (value) => remap (value, min, max, -maxRotation, maxRotation);

    const state =
    {
        rotation: undefined,
    };

    const update = (nextValue, force) =>
    {
        const degrees = toRotation (nextValue);

        if (! force && state.rotation === degrees)
            return;

        state.rotation = degrees;
        element.style.transform = `rotate(${degrees}deg)`
    };

    onEdit = toStatefulEditCallback (controlled, onEdit, update);

    const force = true;
    update (initialValue, force);

    let accumulatedRotation, touchIdentifier, previousClientY;

    const nextRotation = (rotation, delta) =>
    {
        const clamp = (v, min, max) => Math.min (Math.max (v, min), max);
        return clamp (rotation - delta, -maxRotation, maxRotation);
    };

    const onMouseMove = (event) =>
    {
        event.preventDefault();
        const speedMultiplier = event.shiftKey ? 0.25 : 1.5;
        accumulatedRotation = nextRotation (accumulatedRotation, event.movementY * speedMultiplier);
        onEdit?.(toValue (accumulatedRotation));
    };

    const onMouseUp = () =>
    {
        accumulatedRotation = undefined;
        window.removeEventListener ("mousemove", onMouseMove);
        window.removeEventListener ("mouseup", onMouseUp);
        onEndEdit?.();
    };

    const onMouseDown = () =>
    {
        accumulatedRotation = state.rotation;
        onBeginEdit?.();
        window.addEventListener ("mousemove", onMouseMove);
        window.addEventListener ("mouseup", onMouseUp);
    };

    const onTouchMove = (event) =>
    {
        for (const touch of event.changedTouches)
        {
            if (touch.identifier == touchIdentifier)
            {
                event.preventDefault(); 
                const speedMultiplier = event.shiftKey ? 0.25 : 1.5;
                const movementY = touch.clientY - previousClientY;
                previousClientY = touch.clientY;
                accumulatedRotation = nextRotation (accumulatedRotation, movementY * speedMultiplier);
                onEdit?.(toValue (accumulatedRotation));
            }
        }
    };

    const onTouchStart = (event) =>
    {
        accumulatedRotation = state.rotation;
        previousClientY = event.changedTouches[0].clientY
        touchIdentifier = event.changedTouches[0].identifier;
        onBeginEdit?.();
        window.addEventListener ("touchmove", onTouchMove);
        window.addEventListener ("touchend", onTouchEnd);
        event.preventDefault();
    };

    const onTouchEnd = (event) =>
    {
        previousClientY = undefined;
        accumulatedRotation = undefined;
        window.removeEventListener ("touchmove", onTouchMove);
        window.removeEventListener ("touchend", onTouchEnd);
        onEndEdit?.();
        event.preventDefault();
    };

    const onReset = () => setValueAsGesture (initialValue, { onBeginEdit, onEdit, onEndEdit });

    element.addEventListener ("mousedown", onMouseDown);
    element.addEventListener ("dblclick", onReset);
    element.addEventListener ('touchstart', onTouchStart);

    return update;
}

function makeSwitchable ({
    initialValue = false,
    onBeginEdit = () => {},
    onEdit = () => {},
    onEndEdit = () => {},
    element,
    onValueUpdated,
    controlled = true,
} = {})
{
    let active = initialValue;

    const update = (nextValue, force) =>
    {
        if (! force && active === nextValue) return;

        active = nextValue;

        onValueUpdated (active);
    };

    onEdit = toStatefulEditCallback (controlled, onEdit, update);

    const force = true;
    update (active, force);

    element.addEventListener ("click", () => setValueAsGesture (! active, { onBeginEdit, onEdit, onEndEdit }));

    return update;
}

function setValueAsGesture (value, { onBeginEdit, onEdit, onEndEdit })
{
    onBeginEdit?.();
    onEdit?.(value);
    onEndEdit?.();
}

function toStatefulEditCallback (controlled, onEdit, update)
{
    if (controlled)
        return onEdit;

    return (nextValue) =>
    {
        onEdit?.(nextValue);
        update?.(nextValue);
    };
}
