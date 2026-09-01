const {
    app,
    BrowserWindow,
    screen,
    ipcMain
} = require("electron");


let mainWindow = null;
let projectorWindow = null;
let latestProjectorSlide = null;
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

                preload:
                    require("path").join(
                        __dirname,
                        "preload.cjs"
                    ),

                nodeIntegration:
                    false,

                contextIsolation:
                    true,

                sandbox:
                    false

            }

        });


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
   FIND SECOND DISPLAY
========================================================= */

function getProjectorDisplay() {

    const displays =
        screen.getAllDisplays();


    const primaryDisplay =
        screen.getPrimaryDisplay();


    /*
       TEMPORARY TEST MODE

       No physical projector is connected,
       so use the laptop display temporarily.

       This will be reverted after testing.
    */

    if (displays.length === 1) {

        console.log(
            "TEST MODE: using primary display as projector."
        );

        return primaryDisplay;

    }


    /*
       Normal production behavior:
       use a display other than the laptop.
    */

    return displays.find(
        display =>
            display.id !==
            primaryDisplay.id
    );

}


/* =========================================================
   CREATE PROJECTOR WINDOW
========================================================= */

function createProjectorWindow() {

    if (
        projectorWindow &&
        !projectorWindow.isDestroyed()
    ) {

        projectorWindow.show();

        projectorWindow.focus();

        return true;

    }


    const projectorDisplay =
        getProjectorDisplay();


    if (!projectorDisplay) {

        return false;

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

            x,

            y,

            width,

            height,

            frame:
                false,

            fullscreen:
                true,

            backgroundColor:
                "#050607",

            webPreferences: {

                preload:
                    require("path").join(
                        __dirname,
                        "preload.cjs"
                    ),

                nodeIntegration:
                    false,

                contextIsolation:
                    true,

                sandbox:
                    false

            }

        });


projectorWindow.loadFile(
    require("path").join(
        __dirname,
        "projector.html"
    )
);
   projectorWindow.webContents.on(
    "did-finish-load",
    () => {

        console.log(
            "Projector window ready."
        );


        /*
           If the laptop already has a slide,
           immediately send that slide to the
           newly loaded projector window.
        */

        if (
            latestProjectorSlide
        ) {

            projectorWindow.webContents.send(
                "projector-update",
                latestProjectorSlide
            );

        }

    }
);


    projectorWindow.on(
        "closed",
        () => {

            projectorWindow =
                null;

        }
    );


    return true;

}


/* =========================================================
   OPEN PROJECTOR
========================================================= */

ipcMain.handle(
    "open-projector",
    () => {

        const opened =
            createProjectorWindow();


        return {

            opened,

            displayCount:
                screen.getAllDisplays()
                    .length

        };

    }
);


/* =========================================================
   CLOSE PROJECTOR
========================================================= */

ipcMain.handle(
    "close-projector",
    () => {

        if (
            projectorWindow &&
            !projectorWindow.isDestroyed()
        ) {

            projectorWindow.close();

        }


        projectorWindow =
            null;


        return true;

    }
);


/* =========================================================
   SEND SLIDE TO PROJECTOR
========================================================= */

ipcMain.on(
    "projector-slide",
    (
        event,
        data
    ) => {

        /*
           Always remember the latest slide.
        */

        latestProjectorSlide =
            data;


        /*
           If the projector is already loaded,
           send the slide immediately.
        */

        if (
            projectorWindow &&
            !projectorWindow.isDestroyed()
        ) {

            projectorWindow.webContents.send(
                "projector-update",
                data
            );

        }

    }
);

/* =========================================================
   PROJECTOR KEYBOARD COMMAND
========================================================= */

ipcMain.on(
    "projector-command",
    (
        event,
        data
    ) => {

        if (
            mainWindow &&
            !mainWindow.isDestroyed()
        ) {

            mainWindow.webContents.send(
                "projector-command",
                data
            );

        }

    }
);


/* =========================================================
   DISPLAY CHANGES
========================================================= */

app.whenReady()
    .then(
        () => {

            createMainWindow();


            screen.on(
                "display-added",
                () => {

                    console.log(
                        "Display connected."
                    );

                }
            );


            screen.on(
                "display-removed",
                () => {

                    console.log(
                        "Display removed."
                    );


                    if (
                        projectorWindow &&
                        !projectorWindow.isDestroyed()
                    ) {

                        projectorWindow.close();

                    }

                }
            );

        }
    );


/* =========================================================
   APP ACTIVATION
========================================================= */

app.on(
    "activate",
    () => {

        if (
            BrowserWindow
                .getAllWindows()
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