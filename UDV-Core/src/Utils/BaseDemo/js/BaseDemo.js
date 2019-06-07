import { ModuleView } from '../../ModuleView/ModuleView.js';

/**
 * Represents the base HTML content of a demo for UDV and provides methods to dynamically
 * add module views.
 */
export class BaseDemo {
    constructor(config = {}) {
        this.modules = {};
        this.moduleNames = {};
        this.moduleActivation = {};
        this.moduleBindings = {};
        this.requireAuthModules = [];
        this.authService;
        this.config = {};
        this.parentElement;
        this.view;  // itowns view (3d scene)
        this.extent;  // itowns extent (city limits)
        this.renderer;
        this.controls;
        this.temporal;
        ///// Config values for some file paths
        // iconFolder    : folder for icons (for the modules menu)
        // imageFolder   : folder for the logo files (for LIRIS and IMU)
        // logoIMUFile   : filename for IMU logo
        // logoLIRISFile : filename for LIRIS logo
        config = config || {};
        this.iconFolder = config.iconFolder || 'icon';
        this.imageFolder = config.imageFolder || 'img';
        this.logoIMUFile = config.logoIMUFile || 'logo-imu.png';
        this.logoLIRISFile = config.logoLIRISFile || 'logo-liris.png';
    }

    /**
     * Returns the basic html content of the demo
     */
    get html() {
        return /*html*/`
            <input type="checkbox" id="activateTemporal" class="nonVisible">
            <header>
                <div class="header">
                    <div>
                        Icons made by <a href="https://www.freepik.com/"
                        title="Freepik">Freepik</a> from
                        <a href="https://www.flaticon.com/"
                        title="Flaticon">www.flaticon.com</a> is licensed by
                        <a href="http://creativecommons.org/licenses/by/3.0/"
                        title="Creative Commons BY 3.0" target="_blank">
                        CC 3.0 BY</a>
                    </div>
                    <img id="logoIMU" src="${this.imageFolder}/${this.logoIMUFile}" />
                    <img id="logoLIRIS" src="${this.imageFolder}/${this.logoLIRISFile}" />
                </div>
                <input type="checkbox" id="openSidebar">
                <!-- The HTML code corresponds to an hamburger menu icon -->
                <label id="closeHamburger" for="openSidebar">&#x2630</label>
                <div id="${this.menuId}">
                    <div id="navMenu"></div>
                    <!-- This one corresponds to a cross icon -->
                    <label id="openHamburger" for="openSidebar">&#x2716</label>
                    <label for="activateTemporal" id="temporalMenu"
                    class="choiceMenu">Temporal</label>
                </div>
            </header>
            <section id="contentSection">
                <div id="viewerDiv"></div>
            </section>
        `;
    }

    /**
     * Returns the html element representing the upper-left frame of the UI,
     * which contains informations
     * about the logged in user.
     */
    get authenticationFrameHtml() {
        return /*html*/`
            <div id="${this.authenticationMenuLoggedInId}">
                <img src="${this.iconFolder}/profile.svg" id="profileIcon">
                <div id="${this.authenticationUserNameId}"></div>
                <button type="button" id="${this.authenticationLogoutButtonId}"
                class="logInOut">Logout</button>
            </div>
            <div id="${this.authenticationMenuLoggedOutId}">
                <button type="button" id="${this.authenticationLoginButtonId}"
                class="logInOut">Sign in</button>
            </div>
        `;
    }

    /**
     * Appends the demo HTML to an HTML element.
     *
     * @param htmlElement The parent node to add the demo into. The
     * recommended way of implementing the demo is simply to have an
     * empty body and call this method with `document.body` as
     * parameter.
     */
    appendTo(htmlElement) {
        this.parentElement = htmlElement;
        let div = document.createElement('div');
        div.innerHTML = this.html;
        div.id = this.mainDivId;
        htmlElement.appendChild(div);
        this.initViewer();
    }

    //////// MODULE MANAGEMENT

    /**
     * Adds a new module view to the demo.
     *
     * @param moduleId A unique id. Must be a string without spaces. It
     * will be used to generate some HTML ids in the page. It will also
     * be used to look for an icon to put with the button
     * @param moduleClass The module view class. Must implement some
     * methods (`enable`, `disable` and `addEventListener`). The
     * recommended way of implementing them is to extend the
     * `ModuleView` class, as explained [on the
     * wiki](https://github.com/MEPP-team/UDV/wiki/Generic-demo-and-modules-with-ModuleView-&-BaseDemo).
     * @param options An object used to specify various options.
     * `options.name` allows you to specify the name that will be
     * displayed in the toggle button. By default, it makes a
     * transformation of the id (like this : myModule -> My Module).
     * `options.type` is the "type" of the module view that defines how
     * it is added to the demo. The default value is `MODULE_VIEW`,
     * which simply adds a toggle button to the side menu. If set to
     * `AUTHENTICATION_MODULE`, an authentication frame will be created
     * in the upper left corner of the page to contain informations
     * about the user. `options.requireAuth` allows you to
     * specify if this module can be shown without authentication (ie.
     * if no user is logged in). The default value is `false`. If set to
     * `true`, and no athentication module was loaded, it has no effect
     * (the module view will be shown). `options.binding` is the shortcut
     * key code to toggle the module. By default, no shortcut is created.
     */
    addModuleView(moduleId, moduleClass, options = {}) {
        if ((typeof (moduleClass.enable) !== 'function')
         || (typeof (moduleClass.disable) !== 'function')) {
            throw 'A module must implement at least an enable() and a disable() methods';
        }

        //Default name is the id transformed this way :
        // myModule -> My Module
        // my_module -> My module
        let moduleName = moduleId
        .replace(/([A-Z])/g, ' $1')
        .replace(/_/g, ' ')
        .replace(/^./, (str) => str.toUpperCase());
        let type = BaseDemo.MODULE_VIEW;
        let requireAuth = false;
        if (!!options) {
            if (!!options.type) {
                if (options.type === BaseDemo.MODULE_VIEW
                    || options.type === BaseDemo.AUTHENTICATION_MODULE) {
                    type = options.type;
                } else {
                    throw `Invalid value for option 'type' : '${options.type}'`;
                }
            }
            if (!!options.name) {
                moduleName = options.name;
            }
            if (!!options.requireAuth) {
                requireAuth = options.requireAuth;
            }
        }
        const binding = options.binding;

        this.modules[moduleId] = moduleClass;
        this.moduleNames[moduleName] = moduleId;
        this.moduleActivation[moduleId] = false;

        moduleClass.addEventListener(ModuleView.EVENT_ENABLED, () => {
            console.log(`${moduleName} is enabled`);
            this.moduleActivation[moduleId] = true;

        });
        moduleClass.addEventListener(ModuleView.EVENT_DISABLED, () => {
            console.log(`${moduleName} is disabled`);
            this.moduleActivation[moduleId] = false;
        });

        switch (type) {
            case BaseDemo.MODULE_VIEW:
                //create a new button in the menu
                this.createMenuButton(moduleId, moduleName, binding);
                break;
            case BaseDemo.AUTHENTICATION_MODULE:
                this.createAuthenticationFrame(moduleId);
                break;
            default:
                throw `Unknown module type : ${type}`;
        }

        if (requireAuth) {
            this.requireAuthModules.push(moduleId);
            this.updateAuthentication();
        }

        if (!!binding) {
            this.moduleBindings[binding] = moduleId;
        }
    }

    /**
     * Creates a new button in the side menu.
     * @param moduleId The module id.
     * @param buttonText The text to display in the button.
     * @param {String} [accessKey] The key binding for the module.
     */
    createMenuButton(moduleId, buttonText, accessKey) {
        let button = document.createElement('label');
        button.id = this.getModuleButtonId(moduleId);
        button.innerText = buttonText;
        if (!!accessKey) {
            button.accessKey = accessKey;
        }
        this.menuElement.appendChild(button);
        let icon = document.createElement('img');

        //creating an icon
        icon.setAttribute('src', `${this.iconFolder}/${moduleId}.svg`)
        icon.className = 'menuIcon';
        button.insertBefore(icon, button.firstChild);

        //define button behavior
        button.onclick = (() => {
            this.toggleModule(moduleId);
        }).bind(this);
        let moduleClass = this.getModuleById(moduleId);

        //dynamically color the button
        moduleClass.parentElement = this.contentSectionElement;
        moduleClass.addEventListener(ModuleView.EVENT_ENABLED, () => {
            button.className = 'choiceMenu choiceMenuSelected';

        });
        moduleClass.addEventListener(ModuleView.EVENT_DISABLED, () => {
            button.className = 'choiceMenu';
        });
        moduleClass.disable();
    }

    /**
     * Creates an authentication frame for the authentication module.
     * @param authModuleId The id of the authentication module.
     */
    createAuthenticationFrame(authModuleId) {
        let frame = document.createElement('div');
        frame.id = this.authenticationFrameId;
        frame.innerHTML = this.authenticationFrameHtml;
        this.menuElement.insertBefore(frame,
            document.getElementById('openHamburger').nextSibling);
        const authView = this.getModuleById(authModuleId);
        authView.parentElement = this.contentSectionElement;
        const authService = authView.authenticationService;
        this.authenticationLoginButtonElement.onclick = () => {
            if (this.isModuleActive(authModuleId)) {
                authView.disable();
            } else {
                authView.enable();
            }
        };
        this.authenticationLogoutButtonElement.onclick = () => {
            try {
                authService.logout();
            } catch (e) {
                console.error(e);
            }
        };
        
        authService.addObserver(this.updateAuthentication.bind(this));
        this.authService = authService;
        this.updateAuthentication();
    }

    /**
     * This method should be called when the authentication state changes
     *  (ie. a user log in / out), or when a module is added. It has two
     *  purposes :
     *  1. To update the upper-left square of the side menu (which contains
     *     use informations)
     *  2. To show / hide the modules that require authentication (as defined
     *     by the `options` parameter in the method `addModuleView`
     */
    updateAuthentication() {
        if (!!this.authService) {
            if (this.authService.isUserLoggedIn()) {
                const user = this.authService.getUser();
                this.authenticationMenuLoggedInElement.hidden = false;
                this.authenticationMenuLoggedOutElement.hidden = true;
                this.authenticationUserNameElement.innerHTML =
                    `${user.firstname} ${user.lastname}`;
                for (let mid of this.requireAuthModules) {
                    this.getModuleButton(mid).style.removeProperty('display');
                }
            } else {
                this.authenticationMenuLoggedInElement.hidden = true;
                this.authenticationMenuLoggedOutElement.hidden = false;
                for (let mid of this.requireAuthModules) {
                    this.getModuleButton(mid).style.setProperty('display',
                        'none');
                }
            }
        }
    }

    /**
     * Returns if the module view is currently enabled or not.
     * @param moduleId The module id.
     */
    isModuleActive(moduleId) {
        return this.moduleActivation[moduleId];
    }

    /**
     * Returns the module view class by its id.
     * @param moduleId The module id. 
     */
    getModuleById(moduleId) {
        return this.modules[moduleId];
    }

    /**
     * If the module view is enabled, disables it, else, enables it.
     * @param moduleId The module id. 
     */
    toggleModule(moduleId) {
        if (!this.isModuleActive(moduleId)) {
            this.getModuleById(moduleId).enable();
        } else {
            this.getModuleById(moduleId).disable();
        }
    }

    getModuleButtonId(moduleId) {
        return `_base_demo_menu_button${moduleId}`;
    }

    // Get module button element
    getModuleButton(moduleId) {
        return document.getElementById(this.getModuleButtonId(moduleId));
    }

    /**
     * Initialize the iTowns 3D view.
     */
    initViewer() {
        const terrainAndElevationRequest = 'https://download.data.grandlyon.com/wms/grandlyon';

        // use this line for distant building server
        const buildingServerRequest = 'http://rict.liris.cnrs.fr/UDVDemo/Data/tileset.json';

        // if true, replace regular controls by controls adapted to finding precise orientation for documents
        // use false for regular controls (generic user)
        let useControlsForEditing = false;

        // Initialization of the renderer, view and extent
        [this.view, this.extent] = udvcore.Setup3DScene(terrainAndElevationRequest,
            buildingServerRequest,
            true);

        // The renderer provided by THREE.js as handled over by itowns
        this.renderer = this.view.scene;

        // camera starting position (south-west of the city, altitude 2000)
        this.view.camera.setPosition(new udvcore.itowns.Coordinates('EPSG:3946', this.extent.west(), this.extent.south(), 2000));
        // camera starting orientation (looking at city center)
        this.view.camera.camera3D.lookAt(this.extent.center().xyz());


        // PlanarControls (camera controller) options : regular mode (generic user) or edit mode
        // edit mode is more precise but less ergonomic : used to determine precise orientation for documents
        // see itowns/src/Renderer/ThreeExtended/PlanarControls.js for options parameters
        const optionsRegularMode = {
            maxAltitude: 15000,
            rotateSpeed: 3.0,
            autoTravelTimeMin: 2,
            autoTravelTimeMax: 6,
        };
        const optionsEditMode = {
            maxAltitude: 17000,
            rotateSpeed: 1.5,
            zoomInFactor: 0.04,
            zoomOutFactor: 0.04,
            maxPanSpeed: 5.0,
            minPanSpeed: 0.01,
            maxZenithAngle: 88,
        };

        // itowns' PlanarControls (camera controller) uses optionsEditMode or
        // optionsRegularMode depending on the value useControlsForEditing (boolean)
        this.controls = new udvcore.itowns.PlanarControls(this.view, (useControlsForEditing) ? optionsEditMode : optionsRegularMode);

        //////////// Temporal controller section

        // Retrieve the layer defined in Setup3DScene (we consider the first one
        // with the given name)
        const $3dTilesTemporalLayer = this.view.getLayers(layer => layer.name === '3d-tiles-temporal')[0];

        // Definition of the callback that is in charge of triggering a refresh
        // of the displayed layer when its (the layer) associated date has changed.
        let refreshDisplayLayerOnDate = (date) => {
            $3dTilesTemporalLayer.displayDate = date;
            this.view.notifyChange($3dTilesTemporalLayer);
        }

        // Instanciate a temporal controller
        this.temporal = new udvcore.TemporalController(
            refreshDisplayLayerOnDate,
            {   // Various available constructor options
                minTime: new moment("1700-01-01"),
                maxTime: new moment("2020-01-01"),
                currentTime: new moment().subtract(10, 'years'),
                timeStep: new moment.duration(1, 'years'),
                // or "YYYY-MMM" for Years followed months
                timeFormat: "YYYY",
                active: true
            });

        let temporalButton = document.getElementById('temporalMenu');
        //creating an icon
        let icon = document.createElement('img');
        icon.setAttribute('src', `${this.iconFolder}/temporal.svg`)
        icon.className = 'menuIcon';
        temporalButton.insertBefore(icon, temporalButton.firstChild);

        $3dTilesTemporalLayer.whenReady.then(
            // In order to configure the temporal slide bar widget, we must
            // retrieve the temporal events of displayed data. At this loading
            // stage it could be that the b3dm with the actual dates (down to
            // the building level) are not already loaded, but only their enclosing
            // tiles are at hand. We could recurse on tile hierarchy, but we also
            // have at hand the tileindex that we can (equivalently for the result)
            // iterate on.
            () => {
                // Store the layer for triggering scene updates when temporal slider
                // will be changed by user:
                this.temporal.layer = $3dTilesTemporalLayer;

                const tiles = $3dTilesTemporalLayer.tileIndex.index;
                const resultDates = [];
                for (const currentTileNb in tiles) {
                    const start = tiles[currentTileNb].boundingVolume.start_date;
                    if (start) {
                        resultDates.push(start);
                    }
                    const end = tiles[currentTileNb].boundingVolume.end_date;
                    if (end) {
                        resultDates.push(end);
                    }
                }
                // When there is such thing as a minimum and maximum, inform the temporal
                // widget of the data change and refresh the display.
                // Note: when the dataset doesn't have a minimum of two dates the temporal
                // widget remains with its default min/max values.
                if (resultDates.length >= 2) {
                    resultDates.sort();
                    this.temporal.minTime = new moment(resultDates[0]);
                    this.temporal.maxTime = new moment(resultDates[resultDates.length - 1]);
                    this.temporal.changeTime(this.temporal.minTime);
                    this.temporal.refresh();
                }
            }
        );
    }

    /**
     * Loads a config file. Module views should only be added after calling this method.
     * @param filePath The path to the config file.
     */
    async loadConfigFile(filePath) {
        //loading configuration file
        // see https://github.com/MEPP-team/VCity/wiki/Configuring-UDV
        return $.ajax({
            type: "GET",
            url: filePath,
            datatype: "json",
            success: (data) => {
                this.config = data;
            },
            error: (e) => {
                throw 'Could not load config file : ' + filePath;
            }
        });
    }

    ////////////////////////////////////////////////////////
    // GETTERS FOR HTML IDS AND ELEMENTS OF THE DEMO PAGE //
    ////////////////////////////////////////////////////////

    get mainDivId() {
        return '_base_demo';
    }

    get contentSectionId() {
        return 'contentSection';
    }

    get contentSectionElement() {
        return document.getElementById(this.contentSectionId);
    }

    get menuId() {
        return '_base_demo_menu';
    }

    get menuElement() {
        return document.getElementById(this.menuId);
    }

    get authenticationFrameId() {
        return '_base_demo_profile';
    }

    get authenticationFrameElement() {
        return document.getElementById(this.authenticationFrameId);
    }

    get authenticationLogoutButtonId() {
        return '_base_demo_button_logout';
    }

    get authenticationLogoutButtonElement() {
        return document.getElementById(this.authenticationLogoutButtonId);
    }

    get authenticationLoginButtonId() {
        return '_base_demo_button_login';
    }

    get authenticationLoginButtonElement() {
        return document.getElementById(this.authenticationLoginButtonId);
    }

    get authenticationMenuLoggedInId() {
        return '_base_demo_profile_menu_logged_in';
    }

    get authenticationMenuLoggedInElement() {
        return document.getElementById(this.authenticationMenuLoggedInId);
    }

    get authenticationMenuLoggedOutId() {
        return '_base_demo_profile_menu_logged_out';
    }

    get authenticationMenuLoggedOutElement() {
        return document.getElementById(this.authenticationMenuLoggedOutId);
    }

    get authenticationUserNameId() {
        return '_base_demo_profile_name';
    }

    get authenticationUserNameElement() {
        return document.getElementById(this.authenticationUserNameId);
    }

    static get MODULE_VIEW() {
        return 'MODULE_VIEW';
    }

    static get AUTHENTICATION_MODULE() {
        return 'AUTHENTICATION_MODULE';
    }
}