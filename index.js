const ACCNodeWrapper = require('acc-node-wrapper');
const wrapper = new ACCNodeWrapper();
const fs = require('fs');
const fast_csv = require('fast-csv');
const { time } = require('console');

const date = new Date();
const timeStamp = date.getTime();

wrapper.initSharedMemory(500, 500, 500, false);

if (!fs.existsSync("sessiondata")) {
    fs.mkdirSync("sessiondata");
}

var writeStream = fs.createWriteStream("sessiondata/output_" + timeStamp + ".csv");
const csvStream = fast_csv.format({headers: true});
csvStream.pipe(writeStream).on('end', () => process.exit());

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
    var polar = result.pitch;
    var alpha = result.heading;
    var speed = result.speedKmh 

    var x = - speed * Math.cos(polar) * Math.sin(alpha) * 5 / 18;
    var y = speed * Math.sin(polar) * 5 / 18;
    var z = speed * Math.cos(polar) * Math.cos(alpha) * 5 / 18;

    return [x,y,z]
}

wrapper.on("M_PHYSICS_RESULT", result => {
    var frontleftvector = result.tyreContactHeading[0];
    var frontrightvector = result.tyreContactHeading[1]
    var rearleftvector = result.tyreContactHeading[2];
    var rearrightvector = result.tyreContactHeading[3];
    var velocityvector = result.velocity;
    var suspensionTravel = result.suspensionTravel;
    var steerratio = 14;
    var maxrotation = 240;
    var speed = result.speedKmh 

    var orientation_vector = calculateCarOrientation(result);

    console.log(velocityvector)
    console.log(orientation_vector)

    // calculate dot product
    var fldp = 0;
    var frdp = 0;
    var rldp = 0;
    var rrdp = 0;
    var flmag2 = 0;
    var frmag2 = 0;
    var rlmag2 = 0;
    var rrmag2 = 0;
    var omag2 = 0;

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

    var fl_cos = fldp/(Math.sqrt(flmag2) * Math.sqrt(omag2));
    var fr_cos = frdp/(Math.sqrt(frmag2) * Math.sqrt(omag2));
    var rl_cos = rldp/(Math.sqrt(rlmag2) * Math.sqrt(omag2));
    var rr_cos = rrdp/(Math.sqrt(rrmag2) * Math.sqrt(omag2));

    var conv = 180 / Math.PI;
    var fl_toe = Math.acos(Math.abs(fl_cos)) * conv;
    var fr_toe = Math.acos(Math.abs(fr_cos)) * conv;
    var rr_toe = Math.acos(Math.abs(rr_cos)) * conv;
    var rl_toe = Math.acos(Math.abs(rl_cos)) * conv;

    csvStream.write({
        speed : speed,
        steerangle : result.steerAngle,
        FL_Toe : fl_toe,
        FR_Toe : fr_toe,
        RL_Toe : rl_toe,
        RR_Toe : rr_toe,
        FL_H : suspensionTravel[0],
        FR_H : suspensionTravel[1],
        RL_H : suspensionTravel[2],
        RR_H : suspensionTravel[3]
    });

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
