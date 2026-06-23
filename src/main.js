const massEarth = 5.97216787e24;
const G = 6.6743e-11;
const MU = massEarth * G;
const MU_KM = 398600.4418
const R_EARTH = 6378;

const canvas = document.querySelector(".visualTransfer");
const width = (canvas.width = window.innerWidth/2);
const height = (canvas.height = window.innerHeight/2);

const ctx = canvas.getContext("2d");

ctx.fillStyle = "#1F2232";
ctx.fillRect(0, 0, width, height);


function processNumbers() {

        const initial_altitude = document.getElementById('initialAltitude').value;
        const final_altitude = document.getElementById('finalAltitude').value;

        // Radii
        const initial_radius = initial_altitude*1000 + R_EARTH*1000;
        const r1 = initial_radius/1000;
        const final_radius = final_altitude*1000 + R_EARTH*1000;
        const r2 = final_radius/1000;

        // Hohmann transfer time
        const HTT = Math.sqrt(((4*Math.PI**2)/MU)*((initial_radius+final_radius)/2)**3)/(2);

        // Elipse
        const a = (r1 + r2)/2;
        // Delta-v stuff
        const T = HTT;
        const v1  = Math.sqrt(MU_KM / r1)                        
        const v2  = Math.sqrt(MU_KM / r2)
        const vTp = Math.sqrt(MU_KM * (2/r1 - 1/a))
        const vTa = Math.sqrt(MU_KM * (2/r2 - 1/a))

        const dv1 = vTp - v1;
        const dv2 = v2 - vTa;

        draw(r1, r2);

}



function draw(r1, r2) {


        const rel = 250;
        let radius = [R_EARTH * (rel/r2), r1 * (rel/r2), rel] // 0 - Earth radius, 1 - initial radius, 2 - final radius

        const a = (radius[1] + radius[2])/2;
        const e  = a - radius[1]; 
        const b = Math.sqrt(a**2 - (a-radius[1])**2);

        const canvas = document.querySelector(".visualTransfer");
        const height = (canvas.height = window.innerHeight/2);
        const width = height;

        const ctx = canvas.getContext("2d");

        ctx.fillStyle = "#1F2232";
        ctx.fillRect(0, 0, width, height);

        const gradient = ctx.createLinearGradient(width/2-radius[0], height/2+radius[0], width/2+radius[0], height/2-radius[0]); 
        gradient.addColorStop(0, 'blue');
        gradient.addColorStop(1, 'skyblue');
        ctx.fillStyle = gradient;
        ctx.arc(width/2, height/2, radius[0], 0, 2 * Math.PI); 
        ctx.fill(); 

        // Set style properties
        ctx.lineWidth = 3;
        ctx.strokeStyle = '#8FF7A7';

        // Define the circle path
        ctx.beginPath();
        ctx.arc(width/2, height/2, radius[1], 0, 2 * Math.PI); // x, y, radius, startAngle, endAngle
        ctx.stroke(); // Render the stroke

        ctx.strokeStyle = '#7B287D';

        // Define the circle path
        ctx.beginPath();
        ctx.arc(width/2, height/2, radius[2], 0, 2 * Math.PI); // x, y, radius, startAngle, endAngle
        ctx.stroke(); // Render the stroke

        //elipse

        ctx.lineWidth = 2;
        ctx.strokeStyle = '#F4E76E';
        ctx.setLineDash([20, 15]); 

        ctx.beginPath();
        ctx.ellipse(width/2 - e, height/2, a, b, 0, 0, Math.PI, false);   
        ctx.stroke();


        //burn marks

        ctx.fillStyle = "#D7816A";
        ctx.beginPath();
        ctx.arc(width/2+radius[1], height/2, 5, 0, 2 * Math.PI); 
        ctx.fill(); 

        ctx.arc(width/2-radius[2], height/2, 5, 0, 2 * Math.PI); 
        ctx.fill(); 
/*
        ctx.fillStyle = "white";
        ctx.lineWidth = 1;
        ctx.font = "36px arial";
        ctx.fillText("Earth", width/2-50, height/2+20);
*/
}