void mainImage(out vec4 O, vec2 I)
{    
    for(vec3 r=iResolution, p=vec3(I+I-I,1)-r;
        p.z++<5e2&&((int(r.x) ^ int(r.y) ^ int(r.z))&63)>0;
        r=iTime/.25+p/O.z*.05*O.y+O.x*(O.w)*abs(sin(O.w/r.y/O.y)))
    O=p.zxxx/((p.z*abs(tanh(p.z))+abs(cos(p.z)))-p.zyxy/5e2*p.z*(r.x/(p.y-p.x*((cos(p.z))))));  
}
