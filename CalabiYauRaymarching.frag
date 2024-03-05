#define PI 3.1415926535897932384626433832795

float n = 6.; // The power 'n' for the equation z_1^n + z_2^n = 1

vec2 complexMul(vec2 a, vec2 b) {
    return vec2(a.x * b.x - a.y * b.y, a.x * b.y + a.y * b.x);
}

vec2 complexPow(vec2 z, float power) {
    float theta = atan(z.y, z.x);
    float r = pow(length(z), power);
    return vec2(r * cos(power * theta), r * sin(power * theta));
}

vec2 expComplex(vec2 z) {
    float expReal = exp(z.x);
    return vec2(expReal * cos(z.y), expReal * sin(z.y));
}

// Function to compute the Calabi-Yau manifold condition
bool calabiYauCondition(vec2 z1, vec2 z2, float power) {
    vec2 z1n = complexPow(z1, power);
    vec2 z2n = complexPow(z2, power);
    vec2 sum = z1n + z2n;
    return dot(sum, sum) < .01; // tolerance due to floating-point precision
}

// Adjusted map function to use the parameter representation
float map(vec3 p) {

    float x = PI * p.x; 
    float y = PI * p.y - PI/2.0; 

    float dist = 17000.0; 

    // Iterate over phi1 and phi2
    for (int k1 = 0; k1 < int(n); ++k1) {
        for (int k2 = 0; k2 < int(n); ++k2) {
            float phi1 = 2.0 * PI * float(k1) / n;
            float phi2 = 2.0 * PI * float(k2) / n;

            // Compute z1 and z2 based on the current parameters
            vec2 z1 = complexMul(expComplex(vec2(0.0, phi1)), complexPow(vec2(cos(x), sin(x)), 2.0/n));
            vec2 z2 = complexMul(expComplex(vec2(0.0, phi2)), complexPow(vec2(cos(y), sin(y)), 2.0/n));

            // Check the condition for being on the manifold
            if (calabiYauCondition(z1, z2, n)) {
                // Use the real part of z1 and z2 for visualization
                float realPartZ1 = z1.x;
                float realPartZ2 = z2.x;
                vec3 manifoldPoint = vec3(realPartZ1, realPartZ2, 123.); // We use 0.0 for z because we're visualizing a 2D slice

                // Compute the distance to this point on the manifold
                float newDist = length(manifoldPoint - p);
                if (newDist < dist) {
                    dist = newDist;
                }
            }
        }
    }

    // Return the minimum distance to the manifold
    return dist;
}

// Raymarching function
float rayMarch(vec3 ro, vec3 rd, float minDist, float maxDist, float precis) {
    float depth = minDist;
    float lastDist = maxDist;
    bool isGettingCloser = true;

    while (depth < maxDist && isGettingCloser) {
        vec3 p = ro + rd * depth;
        float dist = map(p);
        
        // Check if we're close enough to the surface
        if (dist < precis) {
            return depth;
        }
        
        // Adaptive step: move forward by the distance to the nearest surface
        depth += dist;

        // Check if we're getting closer to the surface
        isGettingCloser = dist < lastDist;
        lastDist = dist;
    }

    // Return a high value if no intersection was found
    return isGettingCloser ? depth : maxDist;
}

// Normal calculation for raymarching distance fields
vec3 calculateNormal(vec3 p) {
    const float eps = 0.01; // Epsilon value for finite differences
    const vec2 h = vec2(eps, 0.0);

    vec3 normal = vec3(
        map(p + h.xyy) - map(p - h.xyy),
        map(p + h.yxy) - map(p - h.yxy),
        map(p + h.yyx) - map(p - h.yyx));
    return normalize(normal);
}

// Lambertian diffuse lighting function
vec3 computeLighting(vec3 p, vec3 normal, vec3 rd) {
    vec3 lightPos =  vec3(sin(iTime/2.)*200., cos(iTime/2.)*200., 14.);  // Example light position
    vec3 lightDir = normalize(lightPos - p); // Light direction

    // Diffuse component
    float diff = max(dot(normal, lightDir), 0.0);

    // Simple ambient component
    float ambient = 0.225;

    // The color of the object
    vec3 color = vec3(length(calculateNormal(p))); // Example color

    // Combine the diffuse and ambient components with the object color
    vec3 lighting = (ambient + diff) * color;

    // Specular component (optional)
    vec3 viewDir = normalize(-rd);
    vec3 reflectDir = reflect(-lightDir, normal);
    float spec = pow(max(dot(viewDir, reflectDir), 0.0), 49.0); // Shiny
    lighting += vec3(1.0) * spec;
    lighting += vec3(1.0) * spec;
    return lighting;
}

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    // Normalized pixel coordinates (from -1 to 1)
    vec2 uv = (fragCoord - 0.5 * iResolution.xy) / iResolution.y;
    
    // Camera setup
    vec3 ro = vec3(sin(iTime/2.)*200., cos(iTime/2.)*200., 150.); // Camera position
    vec3 rd = normalize(vec3(uv, -1.0)); // Ray direction

    // Raymarching parameters
    float minDist = 0.0; // Start of ray march
    float maxDist = 1600.+1599.9*sin(iTime/5.); // Maximum distance to ray march
    float precis = 0.01; // Precision of the march

    // Perform ray marching
    float t = rayMarch(ro, rd, minDist, maxDist, precis);
    
    // Determine color based on the hit
    vec3 col;
    if (t <= maxDist) {
        // We hit the surface; compute the normal and lighting
        vec3 p = ro + rd * t; // Point on the surface
        vec3 normal = calculateNormal(p); // Calculate the normal at the surface
        col = computeLighting(p, normal, rd); // Compute the lighting based on the normal and view direction
    } else {
        // No hit; use background color
        col = vec3(0.0, 0.0, 0.0);
        
    }
    
    fragColor = vec4(col, 1.0);
}
