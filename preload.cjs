const {
    contextBridge,
    ipcRenderer
} = require("electron");


contextBridge.exposeInMainWorld(
    "electronAPI",
    {

        /*
         * Ask Electron to open the
         * presentation on the second display.
         */

        openProjector:
            () =>
                ipcRenderer.invoke(
                    "open-projector"
                ),


        /*
         * Close the projector window.
         */

        closeProjector:
            () =>
                ipcRenderer.invoke(
                    "close-projector"
                ),


        /*
         * Send the current slide
         * from the laptop interface
         * to the projector.
         */

        sendProjectorSlide:
            data =>
                ipcRenderer.send(
                    "projector-slide",
                    data
                ),


        /*
         * Receive keyboard commands
         * from the projector window.
         */

        onProjectorCommand:
    callback => {

        ipcRenderer.on(
            "projector-command",
            (
                event,
                data
            ) => {

                callback(data);

            }
        );

    },


sendProjectorCommand:
    data =>
        ipcRenderer.send(
            "projector-command",
            data
        ),


        /*
         * Receive slide updates inside
         * the projector window.
         */

        onProjectorSlide:
            callback => {

                ipcRenderer.on(
                    "projector-update",
                    (
                        event,
                        data
                    ) => {

                        callback(data);

                    }
                );

            }

    }
);