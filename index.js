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

function calculateCarOrientation(result) {
    polar = result.pitch;
    alpha = result.heading;
    speed = result.speedKmh 

    x = - speed * Math.cos(polar) * Math.sin(alpha) * 5 / 18;
    y = speed * Math.sin(polar) * 5 / 18;
    z = speed * Math.cos(polar) * Math.cos(alpha) * 5 / 18;

    return [x,y,z]
}

wrapper.on("M_PHYSICS_RESULT", result => {
    frontleftvector = result.tyreContactHeading[0];
    frontrightvector = result.tyreContactHeading[1]
    rearleftvector = result.tyreContactHeading[2];
    rearrightvector = result.tyreContactHeading[3];
    velocityvector = result.velocity;
    steerratio = 14;
    maxrotation = 240;

    orientation_vector = calculateCarOrientation(result);

    console.log(velocityvector)
    console.log(orientation_vector)

    // calculate dot product
    fldp = 0;
    frdp = 0;
    rldp = 0;
    rrdp = 0;
    flmag2 = 0;
    frmag2 = 0;
    rlmag2 = 0;
    rrmag2 = 0;
    omag2 = 0;

    for (i = 0; i < 3; i++)
    {
        // remove the component in y-axis
        if (i == 1) {
            continue;
        }
        fldp = fldp + frontleftvector[i] * orientation_vector[i];
        frdp = frdp + frontrightvector[i] * orientation_vector[i];
        rldp = rldp + rearleftvector[i] * orientation_vector[i];
        rrdp = rrdp + rearrightvector[i] * orientation_vector[i];

        flmag2 = flmag2 + frontleftvector[i] * frontleftvector[i];
        frmag2 = frmag2 + frontrightvector[i] * frontrightvector[i];
        rlmag2 = rlmag2 + rearleftvector[i] * rearleftvector[i];
        rrmag2 = rrmag2 + rearrightvector[i] * rearrightvector[i];
        omag2 = omag2 + orientation_vector[i] * orientation_vector[i]
    }

    fl_cos = fldp/(Math.sqrt(flmag2) * Math.sqrt(omag2));
    fr_cos = frdp/(Math.sqrt(frmag2) * Math.sqrt(omag2));
    rl_cos = rldp/(Math.sqrt(rlmag2) * Math.sqrt(omag2));
    rr_cos = rrdp/(Math.sqrt(rrmag2) * Math.sqrt(omag2));

    conv = 180 / Math.PI;
    fl_toe = Math.acos(Math.abs(fl_cos)) * conv;
    fr_toe = Math.acos(Math.abs(fr_cos)) * conv;
    rl_toe = Math.acos(Math.abs(rl_cos)) * conv;
    rr_toe = Math.acos(Math.abs(rr_cos)) * conv;

    console.log("Steer Angle : " + result.steerAngle)
    console.log("FL : " + fl_toe);
    console.log("FR : " + fr_toe);
    console.log("RL : " + rl_toe);
    console.log("RR : " + rr_toe);
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
