const ACCNodeWrapper = require('acc-node-wrapper');
const wrapper = new ACCNodeWrapper();
const fs = require('fs');
const fast_csv = require('fast-csv');

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

function toSave(a)
{
    if ((a[0] == 0) && (a[1] == 0) && (a[2] == 0))
    {
        return false;
    }

    return true;
}

function anglebetween(a, b)
{
    // ignore the 2nd axis as we are ignoring the vertical component

    dot = a[0] * b[0] + a[2] * b[2];
    det = a[0] * b[2] - a[2] * b[0];

    angle = Math.atan2(det, dot) * 180 / Math.PI;

    if (angle > 0)
    {
        angle = 180 - angle;
    }
    else
    {
        angle = -180 - angle;
    }

    return angle;
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
    var fl_v = result.tyreContactHeading[0];
    var fr_v = result.tyreContactHeading[1]
    var rl_v = result.tyreContactHeading[2];
    var rr_v = result.tyreContactHeading[3];
    var velocityvector = result.velocity;
    var suspensionTravel = result.suspensionTravel;
    var speed = result.speedKmh

    var orientation_vector = calculateCarOrientation(result);
    
    var fl_toe = anglebetween(fl_v, orientation_vector);
    var fr_toe = anglebetween(fr_v, orientation_vector);
    var rl_toe = anglebetween(rl_v, orientation_vector);
    var rr_toe = anglebetween(rr_v, orientation_vector);

    if (toSave(velocityvector))
    {
        // Correct the toes to steer angle

        fl_toe = fl_toe;
        fr_toe = -fr_toe;

        // toe in decimal degrees
        // sus travel in mm

        csvStream.write({
            speed : speed,
            steerangle : result.steerAngle,
            FL_Toe : fl_toe,
            FR_Toe : fr_toe,
            RL_Toe : rl_toe,
            RR_Toe : -rr_toe,
            FL_H : suspensionTravel[0] * 1000,
            FR_H : suspensionTravel[1] * 1000,
            RL_H : suspensionTravel[2] * 1000,
            RR_H : suspensionTravel[3] * 1000
        });
    }

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
