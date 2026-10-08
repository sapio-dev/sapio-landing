/* sofi.js — el orbe de Sofi (el mismo WebGL de las landings) y su campo "tuempresa.cl".
   Copiado de propuesta-agentes.html: si cambia allá, se cambia acá.
   - #sofiOrb > canvas#orbGL: el orbe; los canvas.orb-m de la página lo copian en cada cuadro.
   - form#sofiForm[data-campaign]: lleva a sense.sapio.dev/try con la dirección precompletada.
   - p#sofiLine[data-hola]: lo que dice Sofi, escrito letra a letra. */
(function () {
  var $ = function (s) { return document.querySelector(s); };
  var reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  var orbBox = $('#sofiOrb'), cv = $('#orbGL'), energy = .25, target = .25;
  if (cv) {
  (function(){
      var gl = cv.getContext('webgl', { premultipliedAlpha:true, alpha:true, antialias:true });
      if (!gl){ orbBox.classList.add('nogl'); return; }
      var VS = 'attribute vec2 p;void main(){gl_Position=vec4(p,0.,1.);}';
      var FS = [
        'precision highp float;uniform vec2 uR;uniform float uT;uniform float uE;',
        'float h(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}',
        'float n(vec2 p){vec2 i=floor(p),f=fract(p);vec2 u=f*f*(3.-2.*f);return mix(mix(h(i),h(i+vec2(1,0)),u.x),mix(h(i+vec2(0,1)),h(i+vec2(1,1)),u.x),u.y);}',
        'float fb(vec2 p){float v=0.,a=.5;for(int i=0;i<3;i++){v+=a*n(p);p=p*2.03+vec2(1.7,9.2);a*=.5;}return v;}',
        'void main(){',
        ' vec2 uv=(gl_FragCoord.xy-.5*uR)/min(uR.x,uR.y);float r=length(uv);float R=.36+.006*sin(uT*1.3)*(.4+uE);',
        ' vec2 p=uv/R;float z=sqrt(max(0.,1.-dot(p,p)));float t=uT*(.10+.32*uE);',
        ' vec2 q=p*.85/(z*.5+.5);',
        ' vec2 w=vec2(fb(q+vec2(t,-t*.7)),fb(q*1.1-vec2(t*.8,t)+3.1));',
        ' float k=fb(q*.9+1.5*w+vec2(t*.5,-t*.35));',
        ' vec3 navy=vec3(.06,.07,.17),gold=vec3(1.,.82,.36),pink=vec3(1.,.46,.74),vio=vec3(.74,.47,1.),blue=vec3(.30,.60,1.);',
        ' vec3 c=mix(blue,vio,smoothstep(.2,.75,k));c=mix(c,pink,smoothstep(.42,.9,w.x)*.9);c=mix(c,gold,smoothstep(.55,.95,w.y)*.75);',
        ' c=mix(navy,c,.5+.5*smoothstep(.05,.8,k+.15*w.y));',
        ' float fr=pow(1.-z,2.4);c+=fr*vec3(.6,.66,1.)*.55;',
        ' float sp=pow(max(0.,dot(normalize(vec3(p,z)),normalize(vec3(-.45,.55,.75)))),28.);c+=sp*.5;',
        ' c*=.82+.28*z;',
        ' float a=smoothstep(R,R-.005,r);',
        ' float g=exp(-pow(max(r-R,0.)*9.,1.4))*(.2+.16*uE)*(1.-a)*smoothstep(.5,.4,r);',
        ' vec3 gc=mix(blue,vio,.5+.5*sin(uT*.4));',
        ' gl_FragColor=vec4(c*a+gc*g,a+g);',
        '}'].join('\n');
      function sh(type, src){ var s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); return gl.getShaderParameter(s, gl.COMPILE_STATUS) ? s : null; }
      var vs = sh(gl.VERTEX_SHADER, VS), fs = sh(gl.FRAGMENT_SHADER, FS);
      if (!vs || !fs){ orbBox.classList.add('nogl'); return; }
      var pr = gl.createProgram(); gl.attachShader(pr, vs); gl.attachShader(pr, fs); gl.linkProgram(pr); gl.useProgram(pr);
      var buf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buf);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1,1,-1,-1,1,1,1]), gl.STATIC_DRAW);
      var loc = gl.getAttribLocation(pr, 'p'); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
      var uR = gl.getUniformLocation(pr, 'uR'), uT = gl.getUniformLocation(pr, 'uT'), uE = gl.getUniformLocation(pr, 'uE');
      function size(){ var d = Math.min(devicePixelRatio || 1, 2), b = cv.getBoundingClientRect(); cv.width = Math.round(b.width * d); cv.height = Math.round(b.height * d); gl.viewport(0, 0, cv.width, cv.height); }
      size(); addEventListener('resize', size);
      var vis = true, clock = 0, last = 0, mirrors = document.getElementsByClassName('orb-m');
      /* los orbes chicos de la página copian el del hero en cada cuadro: es el mismo orbe, sin otro contexto WebGL */
      /* rendimiento: cada ~10 cuadros se revisa qué copias están en pantalla; sólo esas se pintan,
         y si no se ve el hero ni ninguna copia, el shader no dibuja nada */
      var tick = 0, anyMirror = false;
      function scan(){
        var H = innerHeight; anyMirror = false;
        for (var i = 0; i < mirrors.length; i++){
          var m = mirrors[i], b = m.getBoundingClientRect();
          m._on = b.width > 0 && b.bottom > -40 && b.top < H + 40;
          if (m._on) anyMirror = true;
        }
      }
      function mirror(){
        var c = cv.width / 2, h = cv.width * .385, d = Math.min(devicePixelRatio || 1, 2);
        for (var i = 0; i < mirrors.length; i++){
          var m = mirrors[i];
          if (m._on === undefined){ var r = m.getBoundingClientRect(); m._on = r.width > 0 && r.bottom > -40 && r.top < innerHeight + 40; if (m._on) anyMirror = true; }
          if (!m._on) continue;
          if (!m._x){ var b = m.getBoundingClientRect(); if (!b.width) continue; m.width = Math.round(b.width * d); m.height = Math.round(b.height * d); m._x = m.getContext('2d'); }
          m._x.clearRect(0, 0, m.width, m.height); m._x.drawImage(cv, c - h, c - h, h * 2, h * 2, 0, 0, m.width, m.height);
        }
      }
      new IntersectionObserver(function(es){ vis = es[0].isIntersecting; }).observe(cv);
      addEventListener('scroll', function(){ tick = 0; }, { passive:true });
      function frame(ts){
        var dt = last ? Math.min(50, ts - last) : 16; last = ts;
        energy += (target - energy) * Math.min(1, dt / 420);
        clock += dt / 1000 * (reduce ? 0 : 1);
        if (tick-- <= 0){ scan(); tick = 10; }
        if (vis || anyMirror){
          gl.uniform2f(uR, cv.width, cv.height); gl.uniform1f(uT, clock + 7); gl.uniform1f(uE, energy); gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
          if (anyMirror) mirror();
        }
        requestAnimationFrame(frame);
      }
      requestAnimationFrame(frame);
    })();

  }

  var LINE = $('#sofiLine'), SF = $('#sofiForm'), SI = $('#sofiInput'), SB = $('#sofiBtn'), typer = 0;
  if (!SF) return;
  function say(html) {
    if (!LINE) return;
    clearInterval(typer); target = 1;
    var tmp = document.createElement('div'); tmp.innerHTML = html; var plain = tmp.textContent, i = 0;
    if (reduce) { LINE.innerHTML = html; target = .25; return; }
    LINE.innerHTML = '<span class="car"></span>';
    typer = setInterval(function () {
      i += 2;
      if (i >= plain.length) { clearInterval(typer); LINE.innerHTML = html; setTimeout(function () { target = SI === document.activeElement ? .55 : .25; }, 300); return; }
      LINE.innerHTML = plain.slice(0, i).replace(/</g, '&lt;') + '<span class="car"></span>';
    }, 22);
  }
  SI.addEventListener('focus', function () { if (target < .55) target = .55; });
  SI.addEventListener('blur', function () { if (target === .55) target = .25; });
  var TRY = 'https://sense.sapio.dev/try';
  SF.addEventListener('submit', function (e) {
    e.preventDefault();
    var v = SI.value.trim().replace(/\s+/g, '');
    if (!/^(https?:\/\/)?([\w-]+\.)+[a-z]{2,}(\/\S*)?$/i.test(v)) { say('Escribe la dirección de tu sitio, por ejemplo <b>tuempresa.cl</b>, y armo tu agente.'); SI.focus(); return; }
    SB.disabled = true; target = .9;
    say('Perfecto. Te llevo a armar tu agente con <b>' + v.replace(/^https?:\/\//, '').replace(/</g, '&lt;') + '</b>…');
    var q = new URLSearchParams({ url: v, utm_source: 'sapio.dev', utm_medium: 'sofi', utm_campaign: SF.dataset.campaign || 'blog' });
    setTimeout(function () { location.href = TRY + '?' + q.toString(); }, reduce || !LINE ? 0 : 900);
  });
  if (LINE && LINE.dataset.hola) setTimeout(function () { say(LINE.dataset.hola); }, reduce ? 0 : 700);
})();
