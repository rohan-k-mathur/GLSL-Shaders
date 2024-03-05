struct rayresult{
    vec3 o; //origin
    vec3 v; //direction
    float dist; //distance
};

#define EPSILON 0.0005
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

mat4 cam = mat4(
    1,0,0,0,
    0,1,0,0,
    0,0,1,0,
    0,0,0,1
);

// Adds a vector to a matrix to create a translation effect
mat4 addmv(mat4 mat, vec3 v){
    mat4 n = mat;
    n[3]=n[3]+vec4(v,0);
    return n;
}

// Creates a translation matrix from a vector
mat4 mat4v(vec3 v){
    return mat4(
        1,0,0,v.x,
        0,1,0,v.y,
        0,0,1,v.z,
        0,0,0,1
    );
}

// Extracts the position vector from a transformation matrix
vec3 matpos(mat4 mat){
    return mat[3].xyz;
}

const float planedist = 1.5800;


float map(vec3 p)
{
    float t = iTime*.25;

    vec3 b = 1.000*cos(1.*p.zyx + vec3(t,t,t));
        float x = PI * p.x; 
    float y = PI * p.y - PI/2.0; 
      float phi1 = PI;//2.0 * PI ;
            float phi2 = 2.0 * PI;
             // Compute z1 and z2 based on the current parameters
            vec2 z1 = complexMul(expComplex(vec2(0.0, phi1)), complexPow(vec2(cos(x), sin(x)), 2.0/n));
            vec2 z2 = complexMul(expComplex(vec2(0.0, phi2)), complexPow(vec2(cos(y), sin(y)), 2.0/n));

           
                float realPartZ1 = z1.x;
                float realPartZ2 = z2.x;
                vec3 manifoldPoint = vec3(realPartZ1, realPartZ2,(0.)); // We use 0.0 for z because we're visualizing a 2D slice
                    b=manifoldPoint;
   b = rotateabout(sin(b), p, length(p));
   

    b += 0.500*sin(8.0*b.zxy);
    b += 0.225*((sin(t*0.975+5.345)+1.25) * 1.7*b.zxy);
    b = rotateabout(-b, p, length(p)+2.);
    
    b += sin((sin(-t*0.812+2.891)+0.23) * 7.*(PI)*b.zxy);
    
    return length(b*length(p*p)) * 0.0049;
}


vec3 estimateNormal(vec3 p) {
    return normalize(vec3(
        map(vec3(p.x + EPSILON, p.y, p.z)) - map(vec3(p.x - EPSILON, p.y, p.z)),
        map(vec3(p.x, p.y + EPSILON, p.z)) - map(vec3(p.x, p.y - EPSILON, p.z)),
        map(vec3(p.x, p.y, p.z  + EPSILON)) - map(vec3(p.x, p.y, p.z - EPSILON))
    ));
}

const int kRaymarchIterations = 1222;
const float mapddivisor = 1.2;
const vec3 sundir = normalize(vec3(0,1,1));
const vec3 suncol = vec3(0.8,0.8,0.8);
const vec3 objcol = vec3(0.78,0.78,0.78);

vec3 manager(rayresult io){

    vec3 skycol = texture(iChannel0,io.v).xyz;
    
	float t = -1.00;
    
	for(int i=0; i<kRaymarchIterations; i++)
	{
        vec3 pos = io.o + io.v * t;
    
		float d = map(pos);
        
        if (d > 10.) { return .7*(vec3(1.)-skycol);}
        
		if(d < 0.001){
            
            vec3 n = estimateNormal(pos);

            float sundot = dot(n,sundir);
            
            vec3 col = suncol * sundot + .9*objcol;
                        
            vec3 sdir = reflect(io.v,n);
            col *= vec3(1.)-.7*texture(iChannel0,sdir).xyz;
            
			return col;
		}
        
        t += d/mapddivisor;
	}
    
    return .7*(vec3(1.)-skycol);
}

void mainImage( out vec4 fragColor, in vec2 fragCoord )
{
    float tick = iTime/5.;
    
    vec2 mouseuv = (iMouse.xy-iResolution.xy/2.0)/iResolution.xx*2.;

    mat4 ncam = cam
        *build_transform(vec3(0,0,0),vec3(0,-mouseuv.x*PI + tick,0))
        *build_transform(vec3(0,0,0),vec3(-mouseuv.y*PI,0,0))
        ;
        
    ncam = ncam
        *build_transform(vec3(0,0,-7.),vec3(0,0,0))
        ;
      
    
    vec3 campos = matpos(ncam);
        
    vec2 uv = (fragCoord-iResolution.xy/2.0)/iResolution.xx*2.;

    vec3 v = normalize(uv.x*ncam[0].xyz+uv.y*ncam[1].xyz+ncam[2].xyz*planedist);

    vec3 color = vec3(0,0,0);

    rayresult ray;
    
    ray.o=campos;
    ray.v=v;
    ray.dist=0.010;

    color += manager(ray);

    color = clamp(color,0.,1.);

    fragColor = vec4(color,1.0);
}
