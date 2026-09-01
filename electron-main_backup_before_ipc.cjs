const {
    app,
    BrowserWindow,
    screen
} = require("electron");

const path =
    require("path");

let mainWindow = null;
let projectorWindow = null;


/* =========================================================
   MAIN WINDOW
========================================================= */

function createMainWindow() {

    mainWindow =
        new BrowserWindow({

            width: 1600,

            height: 900,

            minWidth: 1100,

            minHeight: 700,

            backgroundColor:
                "#050607",

            webPreferences: {

                nodeIntegration:
                    false,

                contextIsolation:
                    true,

                sandbox:
                    false

            }

        });


    /*
       Development:
       Load the existing Vite application.
    */

    mainWindow.loadURL(
        "http://localhost:5173"
    );


    mainWindow.on(
        "closed",
        () => {

            mainWindow =
                null;

            if (
                projectorWindow &&
                !projectorWindow.isDestroyed()
            ) {

                projectorWindow.close();

            }

        }
    );

}


/* =========================================================
   PROJECTOR WINDOW
========================================================= */

function createProjectorWindow() {

    const displays =
        screen.getAllDisplays();


    console.log(
        "Detected displays:",
        displays.length
    );


    /*
       Find a display other than
       the laptop's primary display.
    */

    const primaryDisplay =
        screen.getPrimaryDisplay();


    const projectorDisplay =
        displays.find(
            display =>
                display.id !==
                primaryDisplay.id
        );


    if (!projectorDisplay) {

        console.log(
            "No second display detected."
        );

        return null;

    }


    const {
        x,
        y,
        width,
        height
    } =
        projectorDisplay.bounds;


    projectorWindow =
        new BrowserWindow({

            x: x,

            y: y,

            width: width,

            height: height,

            frame: false,

            fullscreen: true,

            backgroundColor:
                "#050607",

            webPreferences: {

                nodeIntegration:
                    false,

                contextIsolation:
                    true,

                sandbox:
                    false

            }

        });


    /*
       For now the projector loads
       the same application.

       We'll create the dedicated
       Presentation Only route next.
    */

    projectorWindow.loadURL(
        "http://localhost:5173/?projector=true"
    );


    projectorWindow.on(
        "closed",
        () => {

            projectorWindow =
                null;

        }
    );


    return projectorWindow;

}


/* =========================================================
   APP READY
========================================================= */

app.whenReady()
    .then(
        () => {

            createMainWindow();


            /*
               We DON'T automatically create
               the projector window.

               It should only appear when
               Presentation Only is selected.
            */

        }
    );


/* =========================================================
   MACOS BEHAVIOR
========================================================= */

app.on(
    "activate",
    () => {

        if (
            BrowserWindow.getAllWindows()
                .length === 0
        ) {

            createMainWindow();

        }

    }
);


/* =========================================================
   QUIT
========================================================= */

app.on(
    "window-all-closed",
    () => {

        if (
            process.platform !==
            "darwin"
        ) {

            app.quit();

        }

    }
);