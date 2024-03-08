//A fork of etale_cohomology's 'Diffeomorphisms of the disk'
#define TWIST 3.5
#define STRIPES 75.
#define STRIPE_THINNESS 2.

// Phong shading parameters
#define AMBIENT_STRENGTH 0.2
#define DIFFUSE_STRENGTH 0.5
#define SPECULAR_STRENGTH 0.5
#define SHININESS 42.0

mat2 rot(float a) {
    return mat2(cos(a), -sin(a), sin(a), cos(a));
}

mat3 rotateZ(float angle) {
    float c = cos(angle);
    float s = sin(angle);
    return mat3(
        c, 0, s,
        0, 1, 0,
        -s, 0, c
    );
}

float smin(float a, float b, float k) {
    float h = clamp(0.5 - 0.5 * (b - a) / k, 0.0, 1.0);
    return mix(a, b, h) - k * h * (1.0 - h);
}

float smax(float a, float b, float k) {
    float h = clamp(0.5 + 0.5 * (b - a) / k, 0.0, 1.0);
    return mix(a, b, h) + k * h * (1.0 - h);
}

float sdSphere(vec3 p, float r) {
    return length(p) - r;
}

float sdBox(vec3 p, vec3 b) {
    vec3 q = abs(p) - b;
    return length(max(q, 0.0)) + min(max(q.x, max(q.y, q.z)), 0.0);
}

float sdPlane(vec3 p, vec3 n, float d) {
    return dot(p, n) + d;
}

float sdCylinderInf(vec3 p, float r) {
    return length(p.xy) - r;
}

float scene(vec3 p, float r) {
    float d = 99999.99999;
    d = min(d, sdSphere(p, r));
    return d;
}

float raymarch(vec3 ro, vec3 rd, float r) {
    float d = 0.001;

    for (int i = 0; i < 128; i++) {
        vec3 p = ro + rd * d;
        float h = scene(p, r);
        d += h * 0.45;
        if (h < 0.001 || d > 20.0) break;
    }

    if (d > 20.0) return 20.0;
    return d;
}

float calcSoftShadow(vec3 ro, vec3 rd, float k, float r) {
    float mint = 0.001;
    float tmax = 256.0;

    float res = 1.0;
    float t = mint;
    float ph = 1e10;

    for (int i = 0; i < 512; i++) {
        float h = scene(ro + rd * t, r);

        float y = (i == 0) ? 0.0 : h * h / (2.0 * ph);
        float d = sqrt(h * h - y * y);
        res = min(res, k * d / max(0.0, t - y));
        ph = h;

        t += h * 0.45;

        if (res < 0.0001 || t > tmax) break;
    }

    res = clamp(res, 0.0, 1.0);
    return res * res * (3.0 - 2.0 * res);
}

float calcAO(vec3 pos, vec3 nor, float r) {
    float occ = 0.0;
    float sca = 1.0;

    for (int i = 0; i < 5; i++) {
        float h = 0.1 * float(i) / 10.0;
        float d = scene(pos + h * nor, r);
        occ += (h - d) * sca;
        sca *= 0.95;
        if (occ > 0.35) break;
    }

    return clamp(1.0 - 7.0 * occ, 0.0, 1.0);
}

vec3 calcNormal(vec3 p, float r) {
    vec2 e = vec2(1, -1) * 0.001;
    return normalize(vec3(
        e.yyx * scene(p + e.yyx, r) +
        e.xyy * scene(p + e.xyy, r) +
        e.yxy * scene(p + e.yxy, r) +
        e.xxx * scene(p + e.xxx, r)
    ));
}

// Light position
vec3 lightPos = vec3(1.0, 1.0, 1.0);

// Camera parameters
vec3 cameraPos = vec3(0.0, 0.0, 2.0);
vec3 cameraTarget = vec3(0.0, 0.0, 0.0);
vec3 cameraUp = vec3(0.0, 1.0, 0.0);

void mainImage(out vec4 fragColor, in vec2 uv) {
    uv = (2. * uv - iResolution.xy) / iResolution.y;
    uv *= 1.1;

    float rad = 1. - length(uv);
    rad = 1.;
    float phi = atan(uv.y, uv.x);
    float theta = acos(length(uv));

    // Map spherical coordinates to 3D Cartesian coordinates on a unit sphere
    vec3 pos = vec3(
        sin(theta) * cos(phi),
        sin(theta) * sin(phi),
        cos(theta)
    );

    // Rotate the sphere around its Z-axis based on the current time
    float rotationAngle = iTime / 3.; // Adjust the rotation speed as needed
    pos = rotateZ(rotationAngle) * pos;

    // Apply the twisting effect based on the position on the sphere
    float twistvary = TWIST + 2.5 * cos(iTime / 3.);
    float twisting = sin(phi + twistvary * pos.z * cos(iTime / 3.));

    // Calculate the final color based on the twisting effect
    float rgb = theta + twisting;
    float stt = STRIPE_THINNESS + sin(iTime / 3.);
    float st = STRIPES + 50. * sin(iTime / 3.);
    rgb = stt + sin(rgb * st);

    pos *= rgb;

    // Calculate the surface normal
    vec3 normal = normalize(rotateZ(rotationAngle) * pos);

    // Calculate the view direction
    vec3 viewDir = normalize(cameraPos - rotateZ(rotationAngle) * pos);

    // Calculate the light direction
    vec3 lightDir = normalize(lightPos - (rotateZ(rotationAngle) * pos) + .2 * sin(iTime / 3.));

    // Calculate the ambient term
    vec3 ambient = AMBIENT_STRENGTH * vec3(rgb);

    // Calculate the diffuse term
    float diffuse = max(dot(normal, lightDir), 0.0);
    vec3 diffuseColor = DIFFUSE_STRENGTH * diffuse * vec3(rgb);

    // Calculate the specular term
    vec3 reflectDir = reflect(-lightDir, normal);
    float specular = pow(max(dot(viewDir, reflectDir), 0.0), SHININESS);
    vec3 specularColor = SPECULAR_STRENGTH * specular * diffuseColor;

    // Combine the shading components
    vec3 color = ambient + diffuseColor + specularColor;
    color = clamp(pow(color, vec3(1.0 / 1.2)), 0.0, 1.0);
    vec3 bg = vec3(0.7, 0.8, 1.0);

    color *= texture(iChannel1, reflectDir * (rgb)).rgb;
    color = clamp(pow(color, vec3(1.0 / .92)), 0.0, 1.0);

    vec3 ro = vec3(0.0, 0.0, 3.0);
    vec3 rd = normalize(vec3(uv, -2.0));
    ro = viewDir;
    rd = lightDir;

    vec3 col = vec3(0.0);
    bg = vec3(0.7, 0.7, .750);

    float d = raymarch(rotateZ(rotationAngle) * pos, rd, rad);
    if (d > 0.0 && d < 200.0) {
        vec3 nor = calcNormal(rotateZ(rotationAngle) * pos, rad);
        vec3 mate = vec3(0.0);
        vec3 ref = reflect(rd, nor);
        float occ = calcAO(rotateZ(rotationAngle) * pos, nor, rad);

        mate = clamp(texture(iChannel0, ref).rgb, 0.0, 1.0);

        vec3 lig = viewDir;
        float dif = clamp(dot(nor, lig), 0.0, 1.0);
        float spe = 2.0 * pow(clamp(dot(ref, lig), 0.0, 1.0), 10.0);
        dif *= calcSoftShadow(rotateZ(rotationAngle) * pos, lig, 8.0, rad);
        col += mate * dif;
        spe *= calcSoftShadow(rotateZ(rotationAngle) * pos, ref, 4.0, rad);
        col *= mate * 5.0 * spe * dif;
        col += clamp(0.001 * pow(spe, 10.0), 0.0, 1.0) * dif;

        dif += clamp(nor.y * 0.5 + 0.5, 0.0, 1.0);
        spe += clamp(ref.y * 0.5 + 0.5, 0.0, 1.0);
        col += 0.05 * mate * vec3(0.2, 0.4, 1.0) * dif;
        spe *= calcSoftShadow(rotateZ(rotationAngle) * pos, ref, 1.0, rad);
        col += 0.05 * vec3(0.2, 0.4, 1.0) * spe;

        col = clamp(col, 0.0, 1.0) * occ * occ * occ;
    }

    col = clamp(pow(col, vec3(1.0 / 2.2)), 0.0, 1.0);
    col += color;

    col += mix(col, clamp(texture(iChannel0, rd).rgb * bg * texture(iChannel1, rd).rgb, 0.0, 1.0), clamp(0.000001 * d * d * d * d * d, 0.0, 1.0));
    col = clamp(pow(col, vec3(1.0 / .592)), 0.0, 1.0);

    fragColor = vec4(col, 1.0);
}
