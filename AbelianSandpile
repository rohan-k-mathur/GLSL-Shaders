float cquad(mat2 A, float div, vec2 u) {
  float f = dot(u, A*u);
  return f + div - mod(f, div);
}

// the laplacian of the rounded quadratic function described above
float pile(mat2 A, float div, vec2 u) {
  const mat2 e = mat2(1.);
  return cquad(A, div, u + e[0]) + cquad(A, div, u - e[0]) + cquad(A, div, u + e[1]) + cquad(A, div, u - e[1]) - 4.*cquad(A, div, u);
}

// Adapted for 3D
float cquad3D(mat3 A, float div, vec3 u) {
  float f = dot(u, A * u);
  return f + div - mod(f, div);
}

// The 3D Laplacian
float pile3D(mat3 A, float div, vec3 u) {
  const vec3 ex = vec3(1., 0., 0.);
  const vec3 ey = vec3(0., 1., 0.);
  const vec3 ez = vec3(0., 0., 1.);
  
  return cquad3D(A, div, u + ex) + cquad3D(A, div, u - ex) +
         cquad3D(A, div, u + ey) + cquad3D(A, div, u - ey) +
         cquad3D(A, div, u + ez) + cquad3D(A, div, u - ez) -
         6. * cquad3D(A, div, u);
}
vec3 calculateColor(float h, float div) {
    // Default error color is green, indicating a potential floating-point arithmetic issue
    vec3 color = vec3(0., 0., 0.); 

    // Adjust div to match the expected scale of h values
    // Considering div is already adjusted for 3D, you might not need further scaling

    // Map h to specific colors
    if (mod(h, div) == 0.) { // Check if h is an integer multiple of div (integer value)
        if (h == -2. * div) {
            color = vec3(0.2, 0., 0.5); // Purple
        } else if (h == -1. * div) {
            color = vec3(0.5, 0., 0.6);} // Lighter purple
            else if (h == -2. * div) {
            color = vec3(0.75, 0.2, 0.99); // Darker purple
        } else if (h == 0.) {
            color = vec3(0.99, 0.1, 0.1); // Red
        } else if (h == div) {
            color = vec3(1., 0.5, 0.); // Orange
        } else if (h == 2. * div) {
            color = vec3(1., 1., 0.); // Yellow
        } else if (h == 3. * div) {
            color = vec3(1., 1., 0.9); // Light yellow
        } else {
            // For any integer value outside the -2 to 3 range
            color = vec3(1., 1.,1.); // Cyan, indicating a number below -2 or above 3
        }
    }
    // If h is not an integer multiple of div, it remains the default green indicating a non-integer value

    return color;
}

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
  float p = 17. * sqrt(abs(sin(iTime / 480.)));
  float q = 17. * sqrt(abs(cos(iTime / 480.)));
  float r = q*2.;
  
  vec4 v = vec4(p*q-q*r, p*q, p*r, q*r); // Adapted for 3D
  float div = q*q*r; // Adjusted for 3D
  mat3 A = mat3(v.x, v.y, v.z, v.y, v.w, v.z, v.z, v.w, v.x + v.w); // 3D matrix
  
  vec3 u = vec3(fragCoord, (v.x*v.w-v.y*v.w)); // Consider the Z-axis as time or another parameter
  
  float h = pile3D(A, div, u);
  vec3 color = calculateColor(h, div); // Assume this function is adapted for 3D color mapping
  
  fragColor = vec4(color, 1.);
}
