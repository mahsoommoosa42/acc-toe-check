const ACCNodeWrapper = require('acc-node-wrapper');
const wrapper = new ACCNodeWrapper();


wrapper.initSharedMemory(250, 250, 250, false);

function exitHandler(options, exitCode) {
    if (options.cleanup) console.log('clean');
    if (exitCode || exitCode === 0)
    {
        wrapper.disconnectSharedMemory();
        console.log("Broadcast SDK disconnected");
    };
    if (options.exit) process.exit();
}

wrapper.on("M_PHYSICS_RESULT", result => {
    frontleftvector = result.tyreContactHeading[0];
    frontrightvector = result.tyreContactHeading[1]
    rearleftvector = result.tyreContactHeading[2];
    rearrightvector = result.tyreContactHeading[3];

    // calculate dot product
    leftdp = 0;
    rightdp = 0;
    flmag2 = 0;
    frmag2 = 0;
    rlmag2 = 0;
    rrmag2 = 0;

    for (i = 0; i < 3; i++)
    {
        leftdp = leftdp + frontleftvector[i] * rearleftvector[i];
        rightdp = rightdp + frontrightvector[i] * rearrightvector[i];

        flmag2 = flmag2 + frontleftvector[i] * frontleftvector[i];
        frmag2 = frmag2 + frontrightvector[i] * frontrightvector[i];
        rlmag2 = rlmag2 + rearleftvector[i] * rearleftvector[i];
        rrmag2 = rrmag2 + rearrightvector[i] * rearrightvector[i];
    }

    left_cos = leftdp/(Math.sqrt(flmag2) * Math.sqrt(rlmag2));
    right_cos = rightdp/(Math.sqrt(frmag2) * Math.sqrt(rrmag2));

    left_angle = Math.acos(left_cos);
    right_angle = Math.acos(right_cos);

    console.log("Steer Angle : " + result.steerAngle)
    console.log("Left Angle : " + left_angle * 180 / Math.PI);
    console.log("Right Angle : " + right_angle * 180 / Math.PI);
});

//do something when app is closing
process.on('exit', exitHandler.bind(null,{cleanup:true}));

//catches ctrl+c event
process.on('SIGINT', exitHandler.bind(null, {exit:true}));

// catches "kill pid" (for example: nodemon restart)
process.on('SIGUSR1', exitHandler.bind(null, {exit:true}));
process.on('SIGUSR2', exitHandler.bind(null, {exit:true}));

//catches uncaught exceptions
process.on('uncaughtException', exitHandler.bind(null, {exit:true}));
