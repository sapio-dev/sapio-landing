/* El campo de trabajo de la portada: una grilla de celdas sobre el negro de la app. Una corriente
   lenta enciende zonas y, en ellas, celdas sueltas destellan en el azul de la app: cada destello es
   un trabajo hecho en alguna empresa. Dos pasadas de WebGL: la primera calcula el campo una vez por
   celda (barato), la segunda dibuja los cuadrados a la resolución de la pantalla. Sin WebGL queda
   una grilla quieta en CSS; con «menos movimiento», un solo cuadro. Solo corre cuando se ve. */
(() => {
  const lienzos = [...document.querySelectorAll('canvas.campo')];
  if (!lienzos.length) return;
  const quieto = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const tactil = matchMedia('(pointer: coarse)').matches;

  const VERT = 'attribute vec2 p;void main(){gl_Position=vec4(p,0.,1.);}';

  // Pasada 1: una celda por píxel. r = luz, g = cuánto azul, b = destello.
  const CAMPO = `
precision highp float;
uniform vec2 uGrid;
uniform float uT;
uniform vec2 uRaton;
uniform float uFade;
float h21(vec2 p){p=fract(p*vec2(233.34,851.73));p+=dot(p,p+23.45);return fract(p.x*p.y);}
float ruido(vec2 p){vec2 i=floor(p),f=fract(p);vec2 u=f*f*(3.-2.*f);
  return mix(mix(h21(i),h21(i+vec2(1.,0.)),u.x),mix(h21(i+vec2(0.,1.)),h21(i+vec2(1.,1.)),u.x),u.y);}
float fbm(vec2 p){float v=0.,a=.5;for(int i=0;i<5;i++){v+=a*ruido(p);p=p*2.02+vec2(13.7,7.1);a*=.5;}return v;}
void main(){
  vec2 c=floor(gl_FragCoord.xy);
  vec2 uv=(c+.5)/uGrid;                 // 0..1, y hacia arriba
  float y=1.-uv.y;                      // 0 arriba, 1 abajo
  float asp=uGrid.x/uGrid.y;
  float port=step(asp,1.);              // pantalla vertical (teléfono)
  vec2 q=vec2(uv.x*asp,uv.y)*1.35;
  float t=uT*.022;
  vec2 w=vec2(fbm(q+vec2(t,-t*.6)),fbm(q+vec2(-t*.7,t*.5)+4.3));
  float n=fbm(q*1.5+w*1.9+vec2(t*.4,-t*.2));
  float zona=smoothstep(.34,.76,n);
  float azul=smoothstep(.4,.68,fbm(q*.9+w*1.2+vec2(-t*.3,t*.25)+9.1));
  // Sube desde abajo y deja limpio el centro, donde va el titular
  float m=smoothstep(.2,.78,y);
  float e=length(vec2((uv.x-.5)/mix(.42,.8,port),(y-mix(.47,.45,port))/mix(.26,.3,port)));
  m*=mix(mix(.3,.1,port),1.,smoothstep(.55,1.3,e));
  // Destellos: trabajo hecho. Un bloque de 3×3 que se enciende desde el centro y se apaga.
  vec2 bl=floor(c/3.);
  vec2 centro=bl*3.+1.;
  float h=h21(bl*1.37+3.1);
  float per=6.+h21(bl+11.7)*8.;
  float edad=fract(uT/per+h*17.3)*per;
  vec2 dd=c-centro;
  float caida=exp(-dot(dd,dd)*.45);
  float dest=(h>.935?1.:0.)*exp(-edad*2.)*caida*smoothstep(.1,.45,zona+.12);
  // El ratón aviva las celdas cercanas
  float r=0.;
  if(uRaton.x>-1.){vec2 d=(c-uRaton)/vec2(9.,9.);r=exp(-dot(d,d));}
  float luz=.92*zona*m+r*.45;
  float g=clamp(azul*.95+r*.6,0.,1.);
  gl_FragColor=vec4(clamp(luz*uFade,0.,1.),g,clamp(dest*m*uFade+r*.15,0.,1.),1.);
}`;

  // Pasada 2: cuadrados redondeados del tamaño que pide la luz de su celda.
  const PUNTOS = `
precision highp float;
uniform sampler2D uCampo;
uniform vec2 uGrid;
uniform float uPaso;
uniform vec3 uFondo;
void main(){
  vec2 px=gl_FragCoord.xy;
  vec2 celda=floor(px/uPaso);
  vec4 f=texture2D(uCampo,(celda+.5)/uGrid);
  vec2 l=px-(celda+.5)*uPaso;
  float lado=uPaso*(.1+.46*f.r+.3*f.b);
  vec2 d=abs(l)-vec2(lado*.5)+uPaso*.07;
  float sd=length(max(d,0.))+min(max(d.x,d.y),0.)-uPaso*.07;
  float a=1.-smoothstep(-.6,.6,sd);
  vec3 base=vec3(.93,.94,.97);
  vec3 azul=vec3(.333,.651,.988);
  vec3 col=mix(base,azul,f.g*.9);
  float k=f.r;
  col=mix(col*k,azul*1.08,clamp(f.b,0.,1.));
  float alfa=max(k,f.b);
  gl_FragColor=vec4(uFondo+col*a*(alfa>0.?1.:0.),1.);
}`;

  const FONDO = [14 / 255, 14 / 255, 17 / 255];

  function crear(canvas) {
    const gl = canvas.getContext('webgl', { antialias: false, alpha: false, premultipliedAlpha: false, powerPreference: 'low-power' });
    if (!gl) { canvas.classList.add('sin-gl'); return null; }
    const prog = (fs) => {
      const p = gl.createProgram();
      for (const [tipo, src] of [[gl.VERTEX_SHADER, VERT], [gl.FRAGMENT_SHADER, fs]]) {
        const s = gl.createShader(tipo);
        gl.shaderSource(s, src);
        gl.compileShader(s);
        if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) { console.warn(gl.getShaderInfoLog(s)); return null; }
        gl.attachShader(p, s);
      }
      gl.linkProgram(p);
      return gl.getProgramParameter(p, gl.LINK_STATUS) ? p : null;
    };
    const pCampo = prog(CAMPO), pPuntos = prog(PUNTOS);
    if (!pCampo || !pPuntos) { canvas.classList.add('sin-gl'); return null; }
    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const tex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, tex);
    for (const [k, v] of [[gl.TEXTURE_MIN_FILTER, gl.NEAREST], [gl.TEXTURE_MAG_FILTER, gl.NEAREST], [gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE], [gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE]]) gl.texParameteri(gl.TEXTURE_2D, k, v);
    const fb = gl.createFramebuffer();
    const u = (p, n) => gl.getUniformLocation(p, n);
    const U = {
      grid: u(pCampo, 'uGrid'), t: u(pCampo, 'uT'), raton: u(pCampo, 'uRaton'), fade: u(pCampo, 'uFade'),
      campo: u(pPuntos, 'uCampo'), grid2: u(pPuntos, 'uGrid'), paso: u(pPuntos, 'uPaso'), fondo: u(pPuntos, 'uFondo'),
    };
    const est = { gl, canvas, pCampo, pPuntos, buf, tex, fb, U, cols: 0, rows: 0, dpr: 1, paso: 7, raton: [-9, -9], ratonObj: [-9, -9], visible: false, nace: performance.now() };
    medir(est);
    return est;
  }

  function medir(e) {
    const r = e.canvas.getBoundingClientRect();
    const w = Math.max(1, Math.round(r.width)), h = Math.max(1, Math.round(r.height));
    let dpr = Math.min(window.devicePixelRatio || 1, 2);
    if (w * h * dpr * dpr > 7e6) dpr = Math.max(1, Math.sqrt(7e6 / (w * h)));
    e.dpr = dpr;
    e.paso = w < 720 ? 4.2 : 4.6;
    e.canvas.width = Math.round(w * dpr);
    e.canvas.height = Math.round(h * dpr);
    e.cols = Math.ceil(w / e.paso) + 1;
    e.rows = Math.ceil(h / e.paso) + 1;
    const gl = e.gl;
    gl.bindTexture(gl.TEXTURE_2D, e.tex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, e.cols, e.rows, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
    gl.bindFramebuffer(gl.FRAMEBUFFER, e.fb);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, e.tex, 0);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    e.altoCss = h;
  }

  function dibujar(e, t) {
    const { gl, U } = e;
    const fade = quieto ? 1 : 1 - Math.pow(1 - Math.min(1, (performance.now() - e.nace) / 1800), 3);
    gl.bindFramebuffer(gl.FRAMEBUFFER, e.fb);
    gl.viewport(0, 0, e.cols, e.rows);
    gl.useProgram(e.pCampo);
    gl.bindBuffer(gl.ARRAY_BUFFER, e.buf);
    let loc = gl.getAttribLocation(e.pCampo, 'p');
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    gl.uniform2f(U.grid, e.cols, e.rows);
    gl.uniform1f(U.t, t);
    gl.uniform1f(U.fade, fade);
    // el ratón llega en píxeles CSS desde arriba; la grilla cuenta desde abajo
    e.raton[0] += (e.ratonObj[0] - e.raton[0]) * 0.12;
    e.raton[1] += (e.ratonObj[1] - e.raton[1]) * 0.12;
    const rx = e.ratonObj[0] < -1 ? -9 : e.raton[0] / e.paso;
    const ry = e.ratonObj[0] < -1 ? -9 : (e.altoCss - e.raton[1]) / e.paso;
    gl.uniform2f(U.raton, rx, ry);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0, 0, e.canvas.width, e.canvas.height);
    gl.useProgram(e.pPuntos);
    loc = gl.getAttribLocation(e.pPuntos, 'p');
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, e.tex);
    gl.uniform1i(U.campo, 0);
    gl.uniform2f(U.grid2, e.cols, e.rows);
    gl.uniform1f(U.paso, e.paso * e.dpr);
    gl.uniform3f(U.fondo, FONDO[0], FONDO[1], FONDO[2]);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }

  const campos = lienzos.map(crear).filter(Boolean);
  if (!campos.length) return;

  // El tiempo avanza más rápido mientras se hace scroll: el campo responde al movimiento.
  let t = 9, ultimo = performance.now(), vel = 0, yPrev = scrollY;
  addEventListener('scroll', () => { vel = Math.min(6, vel + Math.abs(scrollY - yPrev) * 0.02); yPrev = scrollY; }, { passive: true });

  const io = new IntersectionObserver((ents) => {
    for (const en of ents) {
      const e = campos.find((c) => c.canvas === en.target);
      if (e) e.visible = en.isIntersecting;
    }
    if (quieto) campos.forEach((e) => e.visible && dibujar(e, t));
  }, { rootMargin: '80px' });
  campos.forEach((e) => io.observe(e.canvas));

  if (!tactil && !quieto) {
    campos.forEach((e) => {
      const zona = e.canvas.parentElement;
      zona.addEventListener('pointermove', (ev) => {
        const r = e.canvas.getBoundingClientRect();
        e.ratonObj = [ev.clientX - r.left, ev.clientY - r.top];
        if (e.raton[0] < -1) e.raton = e.ratonObj.slice();
      }, { passive: true });
      zona.addEventListener('pointerleave', () => { e.ratonObj = [-9, -9]; e.raton = [-9, -9]; });
    });
  }

  let rz;
  addEventListener('resize', () => {
    clearTimeout(rz);
    rz = setTimeout(() => { campos.forEach(medir); if (quieto) campos.forEach((e) => dibujar(e, t)); }, 120);
  });

  if (quieto) { campos.forEach((e) => dibujar(e, t)); return; }

  // 30 cuadros por segundo también en el computador: el movimiento es lento y no se nota, y a 60 o 120
  // cuadros ponía lento el equipo (revisión de los socios, 29/10). 31 deja pasar uno de cada dos o cuatro.
  const minDt = 1000 / 31;
  function cuadro(ahora) {
    requestAnimationFrame(cuadro);
    if (document.hidden) { ultimo = ahora; return; }
    const dt = ahora - ultimo;
    if (dt < minDt) return;
    ultimo = ahora;
    vel *= 0.92;
    t += Math.min(dt, 64) / 1000 * (1 + vel);
    for (const e of campos) if (e.visible) dibujar(e, t);
  }
  requestAnimationFrame(cuadro);
})();
