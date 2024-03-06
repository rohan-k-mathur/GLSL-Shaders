//A fork of tmst's 'Hopf fibers' shader

#define PI 3.14159

#define FIXED_UP vec3(0.,1.,0.)
#define TAN_HFOVY .5773502691896257

#define GE1 vec3(.01,0.,0.)
#define GE2 vec3(0.,.01,0.)
#define GE3 vec3(0.,0.,.01)
#define STEP_D .01

#define RES iResolution
#define MS iMouse
#define PHASE smoothstep(.2, .8, MS.z > 0. ? MS.y/RES.y : .5+.5*cos(.24*iTime))
#define ANG (MS.z > 0. ? 2.*PI*MS.x/RES.x : PI + .5*iTime)


float square(float x) { return x*x; }

float rand(vec2 p) {
    return fract(sin(dot(p,vec2(12.9898,78.233))) * 43758.5453);
}

vec3 nvCamDirFromClip(vec3 nvFw, vec2 c) {
    vec3 nvRt = normalize(cross(nvFw, FIXED_UP));
    vec3 nvUp = cross(nvRt, nvFw);
    return normalize(TAN_HFOVY*(c.x*(RES.x/RES.y)*nvRt + c.y*nvUp) + nvFw);
}

mat3 oProd(vec3 n) {
    float xy = n.x*n.y, xz = n.x*n.z, yz = n.y*n.z;
    return mat3(n.x*n.x,xy,xz,  xy,n.y*n.y,yz,  xz,yz,n.z*n.z);
}
mat3 glRotate(vec3 axis, float angle) {
    float c = cos(angle), s = sin(angle);
    vec3 n = normalize(axis);
    return (
        (1.-c)*oProd(n) +
        mat3(c,s*n.z,-s*n.y,  -s*n.z,c,s*n.x,  s*n.y,-s*n.x,c)
	);
}

vec3 colormap(vec3 transformedCoords) {
    vec3 normalizedCoords = (transformedCoords + 1.0) / 2.0;

    float r = 0.5 + 0.5 * sin(4. * PI * (normalizedCoords.x + 0.0));
    float g = 0.5 + 0.5 * sin(4. * PI * (normalizedCoords.y + 0.3));
    float b = 0.5 + 0.5 * sin(4. * PI * (normalizedCoords.z + 0.6));

    return vec3(r, g, b);
}

vec3 hopf(vec3 p) {
    float psq = dot(p, p);
    vec4 q = vec4(2.*p.xyz, -1. + psq) / (1. + psq);

    return vec3(
        2.*(q.y*q.z - q.x*q.w+q.y*q.w*q.x),
       3.- 2.*(q.y*q.y + q.w*q.w-q.x*q.z), 
        2.*(q.x*q.y + q.z*q.w-q.z*q.x*q.w)
    );
}

vec4 getV(vec3 p, mat3 m) {
    vec3 rp = m * hopf(p);

	float theta = atan(-rp.z, rp.x);
    float sdy = square(.5 + .5*cos(rp.y*7.*PI));
    float sdt = .5 + .5*sin(theta*30.); 
    float d1 = max(sdt*sdy, .35*sdy);
    d1 = mix(d1, .9*sdy, PHASE); 

    return vec4(.5 + .5*rp.y, 0., 0., d1);
}

vec4 getC(vec3 p, vec3 camPos, mat3 m) {
    vec4 data0 = getV(p, m);
    if (data0.a < .4) { return vec4(0.); }

   vec3 gradA = vec3(
    getV(p + GE1, m).a - getV(p - GE1, m).a,
    getV(p + GE2, m).a - getV(p - GE2, m).a,
    getV(p + GE3, m).a - getV(p - GE3, m).a
);
vec3 normal = normalize(-gradA);

    vec3 matColor = mix(colormap(data0.xyz), .5+.5*normal.xyz, .25);
    
    vec3 lightPos1 = camPos + vec3(-1., 1., 0.);  
    vec3 lightPos2 = camPos + vec3(1., -1., 0.);
    vec3 nvFragToLight1 = normalize(lightPos1 - p);
    vec3 nvFragToLight2 = normalize(lightPos2 - p);

    vec3 nvFragToCam = normalize(camPos - p);

	vec3 diffuse1 = clamp(dot(normal, nvFragToLight1), 0., 1.) * matColor;
    vec3 diffuse2 = clamp(dot(normal, nvFragToLight2), 0., 1.) * matColor;
    
    vec3 blinnH1 = normalize(nvFragToLight1 + nvFragToCam);
    vec3 blinnH2 = normalize(nvFragToLight2 + nvFragToCam);
    vec3 specular1 = pow(clamp(dot(normal, blinnH1), 0., 1.), 80.) * vec3(1.);
    vec3 specular2 = pow(clamp(dot(normal, blinnH2), 0., 1.), 80.) * vec3(1.);

    return vec4(.4*matColor+.3*(diffuse1+specular1)+.3*(diffuse2+specular2), pow(data0.w, 4.));
}


void march(in vec3 p, in vec3 nv, float nearClip, out vec4 color) {
    color = vec4(0.);
    vec2 tRange = vec2(mix(-PI, PI, PHASE), 8.);

	mat3 m = glRotate( normalize(vec3(1.,sin(iTime),cos(iTime))), -ANG );

    float t = max(tRange.s, nearClip); // Apply near clipping
    for (int i=0; i<300; i++) {
        vec4 cHit = getC(p + t*nv, p, m);

        vec4 ci = vec4(cHit.rgb, 1.)*( (STEP_D/.06)*cHit.a ); 
        color += (1.-color.a)*ci;

        t += STEP_D;
        if (t > tRange.t || color.a > .98) { return; }
    }
}

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2 uv = fragCoord/RES.xy;

    // Camera motion
    //float camDist = 3. + 1.*sin(iTime*.3);
    float camAngle = iTime*.5;
    vec3 camPos = .5 * vec3(sin(camAngle), .5, cos(2.*camAngle));
    
    vec3 nvCamDir = nvCamDirFromClip(normalize(-camPos), uv*2. - 1.);

    // Near clipping
    float nearClip = 0.41;
    
    vec4 objColor;
    march(camPos + rand(fragCoord)*nvCamDir*STEP_D, nvCamDir, nearClip, objColor);
    vec3 finalColor = objColor.rgb + (1. - objColor.a)*vec3(.1);

    fragColor = vec4(finalColor, 1.);
}
