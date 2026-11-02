/* La luz de Sapio: la misma luz granulada que el cliente ve al entrar a la app (tres colores que
   fluyen en bandas, con grano), dibujada en WebGL. Dos pasadas: la primera calcula el color a baja
   resolución (la luz es suave y no necesita más), la segunda la amplía y le pone el grano a la
   resolución de la pantalla. Cada lienzo trae sus colores (data-a, data-b, data-c: la luz de cada
   industria) y su encuadre (data-luz). Sin WebGL queda un degradé quieto en CSS; con «menos
   movimiento», un solo cuadro. Solo corre mientras se ve. */
(() => {
  const lienzos = [...document.querySelectorAll('canvas.luz')];
  if (!lienzos.length) return;
  const quieto = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const tactil = matchMedia('(pointer: coarse)').matches;

  const VERT = 'attribute vec2 p;void main(){gl_Position=vec4(p,0.,1.);}';

  // Pasada 1: el color de la luz, sin grano.
  const LUZ = `
precision highp float;
uniform vec2 uGrid;
uniform float uT;
uniform vec3 uA;
uniform vec3 uB;
uniform vec3 uC;
uniform vec3 uFondo;
uniform vec2 uFoco;
uniform float uAlcance;
uniform float uMin;
uniform float uEnc;
uniform float uFade;
uniform vec2 uRaton;
float h21(vec2 p){p=fract(p*vec2(233.34,851.73));p+=dot(p,p+23.45);return fract(p.x*p.y);}
float ruido(vec2 p){vec2 i=floor(p),f=fract(p);vec2 u=f*f*(3.-2.*f);
  return mix(mix(h21(i),h21(i+vec2(1.,0.)),u.x),mix(h21(i+vec2(0.,1.)),h21(i+vec2(1.,1.)),u.x),u.y);}
float fbm(vec2 p){float v=0.,a=.5;for(int i=0;i<4;i++){v+=a*ruido(p);p=p*2.03+vec2(11.3,5.7);a*=.5;}return v;}
void main(){
  vec2 uv=(gl_FragCoord.xy+.5)/uGrid;
  float asp=uGrid.x/uGrid.y;
  vec2 q=vec2((uv.x-.5)*asp,uv.y-.5);
  float t=uT*.05;
  // El plano del inicio de sesión: los tres colores corren en bandas diagonales (~50°) que un
  // flujo lento tuerce. Cobre a un lado, pervinca al medio, azul aciano al otro.
  float c=cos(.87),s=sin(.87);
  vec2 p=vec2(c*q.x-s*q.y,s*q.x+c*q.y);
  vec2 w=vec2(fbm(p*1.1+vec2(t,-t*.7)),fbm(p*1.1+vec2(-t*.6,t*.5)+5.2));
  float x=p.x*.8+.5+(w.x-.5)*.75+.12*sin(p.y*2.2+t*1.1);
  // Cobre ancho arriba a la izquierda, pervinca al medio, aciano abajo a la derecha: el barrido del login.
  vec3 col=mix(uB,uA,smoothstep(.3,.62,x));
  col=mix(col,uC,smoothstep(.6,.95,x));
  col=mix(col,uB*.9+uC*.2,smoothstep(1.,1.3,x));
  // Relieve: crestas encendidas y sombras lila, nunca negras ni azul marino.
  float n=fbm(p*2.1+w*1.3+vec2(t*.4,-t*.2));
  float rel=smoothstep(.18,.82,n*.8+w.y*.45);
  vec3 valle=mix(uC,vec3(.42,.34,.62),.55)*.62;
  col=mix(valle,col*1.06,.38+.62*rel);
  float lu=dot(col,vec3(.299,.587,.114));
  col=max(mix(vec3(lu),col,1.42),0.);
  col=pow(col,vec3(1.1));
  // Encuadre: dónde se enciende la luz en este lugar de la página.
  vec2 f=uFoco;
  if(uRaton.x>-1.) f=mix(f,uRaton,.18);
  float d=length(vec2((uv.x-f.x)*asp,uv.y-f.y));
  float m=mix(uMin,1.,smoothstep(uAlcance,0.,d));
  m*=uEnc;
  gl_FragColor=vec4(mix(uFondo,col,clamp(m*uFade,0.,1.)),1.);
}`;

  // Pasada 2: se amplía la luz y se le pone grano de color, más fuerte donde hay más luz.
  const GRANO = `
precision highp float;
uniform sampler2D uLuz;
uniform vec2 uRes;
uniform float uSem;
uniform float uGrano;
float h(vec2 p){return fract(sin(dot(p,vec2(12.9898,78.233)))*43758.5453);}
void main(){
  vec2 uv=gl_FragCoord.xy/uRes;
  vec3 c=texture2D(uLuz,uv).rgb;
  vec2 g=floor(gl_FragCoord.xy)+uSem*vec2(1.731,4.173);
  vec3 n=vec3(h(g),h(g+3.17),h(g+7.71))-.5;
  float l=dot(c,vec3(.299,.587,.114));
  c+=n*uGrano*(.35+l*1.1);
  gl_FragColor=vec4(c,1.);
}`;

  const hex = (h, def) => {
    const m = /^#?([0-9a-f]{6})$/i.exec(h || '');
    if (!m) return def;
    const v = parseInt(m[1], 16);
    return [((v >> 16) & 255) / 255, ((v >> 8) & 255) / 255, (v & 255) / 255];
  };
  const FONDO = [14 / 255, 14 / 255, 17 / 255];
  // Encuadre de cada lugar: foco (0..1, y hacia arriba), alcance, luz mínima, grano.
  const ENCUADRE = {
    pagina: { foco: [0.62, 0.5], alcance: 1.35, min: 0.5, grano: 0.19 },
    pelicula: { foco: [0.5, 0.42], alcance: 1.45, min: 0.55, grano: 0.19 },
    cierre: { foco: [0.7, 0.5], alcance: 1.4, min: 0.6, grano: 0.2 },
    manifiesto: { foco: [0.8, 0.5], alcance: 1.1, min: 0.25, grano: 0.19 },
    analisis: { foco: [0.92, 0.08], alcance: 0.95, min: 0.0, grano: 0.17 },
  };

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
    const pLuz = prog(LUZ), pGrano = prog(GRANO);
    if (!pLuz || !pGrano) { canvas.classList.add('sin-gl'); return null; }
    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const tex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, tex);
    for (const [k, v] of [[gl.TEXTURE_MIN_FILTER, gl.LINEAR], [gl.TEXTURE_MAG_FILTER, gl.LINEAR], [gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE], [gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE]]) gl.texParameteri(gl.TEXTURE_2D, k, v);
    const fb = gl.createFramebuffer();
    const u = (p, n) => gl.getUniformLocation(p, n);
    const U = {
      grid: u(pLuz, 'uGrid'), t: u(pLuz, 'uT'), a: u(pLuz, 'uA'), b: u(pLuz, 'uB'), c: u(pLuz, 'uC'), fondo: u(pLuz, 'uFondo'),
      foco: u(pLuz, 'uFoco'), alcance: u(pLuz, 'uAlcance'), min: u(pLuz, 'uMin'), enc: u(pLuz, 'uEnc'), fade: u(pLuz, 'uFade'), raton: u(pLuz, 'uRaton'),
      luz: u(pGrano, 'uLuz'), res: u(pGrano, 'uRes'), sem: u(pGrano, 'uSem'), grano: u(pGrano, 'uGrano'),
    };
    const d = canvas.dataset;
    const enc = ENCUADRE[d.luz] || ENCUADRE.pagina;
    const est = {
      gl, canvas, pLuz, pGrano, buf, tex, fb, U, enc,
      A: hex(d.a, [0.639, 0.725, 1]), B: hex(d.b, [0.859, 0.686, 0.592]), C: hex(d.c, [0.451, 0.565, 0.882]),
      cols: 0, rows: 0, visible: false, encendido: d.luz === 'manifiesto' ? 0 : 1, raton: [-9, -9], ratonObj: [-9, -9], nace: performance.now(),
    };
    medir(est);
    return est;
  }

  function medir(e) {
    const r = e.canvas.getBoundingClientRect();
    const w = Math.max(1, Math.round(r.width)), h = Math.max(1, Math.round(r.height));
    let dpr = Math.min(window.devicePixelRatio || 1, 2);
    if (w * h * dpr * dpr > 6e6) dpr = Math.max(1, Math.sqrt(6e6 / (w * h)));
    e.canvas.width = Math.round(w * dpr);
    e.canvas.height = Math.round(h * dpr);
    e.cols = Math.max(2, Math.ceil(w / 7));
    e.rows = Math.max(2, Math.ceil(h / 7));
    const gl = e.gl;
    gl.bindTexture(gl.TEXTURE_2D, e.tex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, e.cols, e.rows, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
    gl.bindFramebuffer(gl.FRAMEBUFFER, e.fb);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, e.tex, 0);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  }

  let sem = 0;
  function dibujar(e, t) {
    const { gl, U } = e;
    const fade = quieto ? 1 : 1 - Math.pow(1 - Math.min(1, (performance.now() - e.nace) / 1600), 3);
    const obj = e.canvas.dataset.luz === 'manifiesto' ? (+e.canvas.dataset.enc || 0) : 1;
    e.encendido += (obj - e.encendido) * 0.05;
    gl.bindFramebuffer(gl.FRAMEBUFFER, e.fb);
    gl.viewport(0, 0, e.cols, e.rows);
    gl.useProgram(e.pLuz);
    gl.bindBuffer(gl.ARRAY_BUFFER, e.buf);
    let loc = gl.getAttribLocation(e.pLuz, 'p');
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    gl.uniform2f(U.grid, e.cols, e.rows);
    gl.uniform1f(U.t, t);
    gl.uniform3fv(U.a, e.A);
    gl.uniform3fv(U.b, e.B);
    gl.uniform3fv(U.c, e.C);
    gl.uniform3fv(U.fondo, FONDO);
    gl.uniform2f(U.foco, e.enc.foco[0], e.enc.foco[1]);
    gl.uniform1f(U.alcance, e.enc.alcance);
    gl.uniform1f(U.min, e.enc.min);
    gl.uniform1f(U.enc, e.encendido);
    gl.uniform1f(U.fade, fade);
    e.raton[0] += (e.ratonObj[0] - e.raton[0]) * 0.06;
    e.raton[1] += (e.ratonObj[1] - e.raton[1]) * 0.06;
    gl.uniform2f(U.raton, e.ratonObj[0] < -1 ? -9 : e.raton[0], e.ratonObj[0] < -1 ? -9 : e.raton[1]);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0, 0, e.canvas.width, e.canvas.height);
    gl.useProgram(e.pGrano);
    loc = gl.getAttribLocation(e.pGrano, 'p');
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, e.tex);
    gl.uniform1i(U.luz, 0);
    gl.uniform2f(U.res, e.canvas.width, e.canvas.height);
    gl.uniform1f(U.sem, sem);
    gl.uniform1f(U.grano, e.enc.grano);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }

  const luces = lienzos.map(crear).filter(Boolean);
  if (!luces.length) return;

  // El tiempo avanza un poco más rápido mientras se hace scroll: la luz responde al movimiento.
  let t = 12, ultimo = performance.now(), vel = 0, yPrev = scrollY, ultGrano = 0;
  addEventListener('scroll', () => { vel = Math.min(4, vel + Math.abs(scrollY - yPrev) * 0.012); yPrev = scrollY; }, { passive: true });

  const io = new IntersectionObserver((ents) => {
    for (const en of ents) {
      const e = luces.find((c) => c.canvas === en.target);
      if (e) e.visible = en.isIntersecting;
    }
    if (quieto) luces.forEach((e) => e.visible && dibujar(e, t));
  }, { rootMargin: '80px' });
  luces.forEach((e) => io.observe(e.canvas));

  // La luz se inclina, apenas, hacia el puntero.
  if (!tactil && !quieto) {
    luces.forEach((e) => {
      const zona = e.canvas.parentElement;
      zona.addEventListener('pointermove', (ev) => {
        const r = e.canvas.getBoundingClientRect();
        e.ratonObj = [(ev.clientX - r.left) / r.width, 1 - (ev.clientY - r.top) / r.height];
        if (e.raton[0] < -1) e.raton = e.ratonObj.slice();
      }, { passive: true });
      zona.addEventListener('pointerleave', () => { e.ratonObj = [-9, -9]; e.raton = [-9, -9]; });
    });
  }

  let rz;
  addEventListener('resize', () => {
    clearTimeout(rz);
    rz = setTimeout(() => { luces.forEach(medir); if (quieto) luces.forEach((e) => dibujar(e, t)); }, 120);
  });

  if (quieto) { luces.forEach((e) => dibujar(e, t)); return; }

  // 30 cuadros por segundo también en el computador: el movimiento es lento y no se nota, y a 60 o 120
  // cuadros ponía lento el equipo (revisión de los socios, 29/10). 31 deja pasar uno de cada dos o cuatro.
  const minDt = 1000 / 31;
  function cuadro(ahora) {
    requestAnimationFrame(cuadro);
    if (document.hidden) { ultimo = ahora; return; }
    const dt = ahora - ultimo;
    if (dt < minDt) return;
    ultimo = ahora;
    vel *= 0.93;
    t += Math.min(dt, 64) / 1000 * (1 + vel);
    // El grano cambia a 12 cuadros por segundo, como el de una película: vivo, sin hervir.
    if (ahora - ultGrano > 83) { sem = (sem + 1) % 977; ultGrano = ahora; }
    for (const e of luces) if (e.visible) dibujar(e, t);
  }
  requestAnimationFrame(cuadro);
})();
