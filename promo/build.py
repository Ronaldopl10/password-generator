#!/usr/bin/env python3
"""
Pipeline del promo de IronKey.

Todo contra la Subscription Key de M Plan (plan Go) leída de
/home/ronaldo/.gentle-shell/agent/auth.json -> minimax.key (prefijo sk-cp-).
El modelo de video NO se usa: el plan Go lo rechaza con 402.

Etapas: images -> vo -> music -> clips -> assemble
Uso: python3 build.py [images|vo|music|clips|assemble|all]
"""
import json
import os
import subprocess
import sys
import urllib.error
import urllib.request
import wave

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "out")
IMG = os.path.join(OUT, "img")
VO = os.path.join(OUT, "vo")
CLIP = os.path.join(OUT, "clip")
FF = os.path.join(HERE, "node_modules", "ffmpeg-static", "ffmpeg")
API = "https://api.minimax.io"
KEY = json.load(open("/home/ronaldo/.gentle-shell/agent/auth.json"))["minimax"]["key"]

FONT_BOLD = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"
FONT_REG = "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"

W, H, FPS = 1920, 1080, 30

# ---------------------------------------------------------------- escenas
SCENES = [
    {
        "id": "01_hook",
        "kind": "image",
        "min_dur": 5.2,
        "title": "La misma contraseña",
        "sub": "en todas tus cuentas",
        "vo": "Usas la misma contraseña en todas tus cuentas. Eso quiere un atacante.",
    },
    {
        "id": "02_brand",
        "kind": "image",
        "min_dur": 5.0,
        "title": "Gestor de contraseñas cifradas",
        "sub": "En la web, con planes",
        "align": 5,
        "pos": (960, 930),
        "vo": "IronKey: un gestor de contraseñas cifradas, con planes.",
    },
    {
        "id": "03_register",
        "kind": "screen",
        "src": "register.png",
        "crop": [1472, 632, 896, 1000],
        "content_h": 880,
        "pad_y": 0,
        "min_dur": 5.6,
        "zoom": 1.03,
        "align": 5,
        "pos": (960, 900),
        "title": "Tu cuenta, en 30 segundos",
        "sub": "Registro con email y contraseña",
        "vo": "Te registras con un email y una contraseña.",
    },
    {
        "id": "04_aes",
        "kind": "screen",
        "src": "login.png",
        "crop": [1472, 740, 896, 784],
        "content_h": 880,
        "pad_y": 0,
        "min_dur": 7.2,
        "zoom": 1.03,
        "align": 5,
        "pos": (960, 900),
        "title": "Cifrado con AES",
        "sub": "En tu cuenta, no en tu navegador",
        "vo": "Lo que guardas queda cifrado con AES. El texto plano nunca se escribe.",
    },
    {
        "id": "05_plans",
        "kind": "screen",
        "src": "pricing.png",
        "crop": [1000, 470, 1920, 880],
        "content_h": 880,
        "pad_y": 0,
        "min_dur": 6.4,
        "zoom": 1.03,
        "align": 5,
        "pos": (960, 900),
        "title": "Tres planes",
        "sub": "Free, Starter o Pro+",
        "vo": "Free, Starter o Pro+. Si llegaste al límite, subes de plan y sigues.",
    },
    {
        "id": "06_generator",
        "kind": "screen",
        "src": "dashboard.png",
        "crop": [1900, 360, 1960, 370],
        "content_h": 380,
        "pad_y": 359,
        "min_dur": 4.4,
        "zoom": 1.03,
        "align": 5,
        "pos": (960, 790),
        "title": "Generá con tus filtros",
        "sub": "Mayúsculas, minúsculas, números, símbolos",
        "vo": "Generas la contraseña con los filtros que quieras.",
    },
    {
        "id": "07_vault",
        "kind": "screen",
        "src": "vault.png",
        "crop": [1960, 2490, 1840, 1070],
        "content_h": 820,
        "pad_y": 0,
        "min_dur": 5.6,
        "zoom": 1.03,
        "align": 5,
        "pos": (960, 900),
        "title": "Guardá y recuperá",
        "sub": "Tu vault es sólo tuyo",
        "vo": "La guardas con un título y la recuperas cifrada cuando la necesitas.",
    },
    {
        "id": "08_cta",
        "kind": "image",
        "min_dur": 4.6,
        "title": "iron-key.vercel.app",
        "sub": "Tus contraseñas seguras",
        "align": 5,
        "pos": (960, 900),
        "vo": "IronKey. Tus contraseñas seguras.",
    },
]


# ---------------------------------------------------------------- helpers
def post(path, payload):
    req = urllib.request.Request(
        API + path,
        data=json.dumps(payload).encode(),
        headers={"Authorization": "Bearer " + KEY, "Content-Type": "application/json"},
    )
    try:
        with urllib.request.urlopen(req, timeout=300) as r:
            return r.status, r.read()
    except urllib.error.HTTPError as e:
        return e.code, e.read()


def ensure_dirs():
    for d in (OUT, IMG, VO, CLIP):
        os.makedirs(d, exist_ok=True)


def probe_duration(path):
    out = subprocess.run([FF, "-i", path], capture_output=True, text=True).stderr
    for line in out.splitlines():
        if "Duration:" in line:
            ts = line.split("Duration:")[1].split(",")[0].strip()
            h, m, s = ts.split(":")
            return int(h) * 3600 + int(m) * 60 + float(s)
    return 0.0


def run(cmd):
    r = subprocess.run(cmd, capture_output=True, text=True)
    if r.returncode != 0:
        raise RuntimeError(f"ffmpeg falló:\n{' '.join(cmd[:12])}...\n{r.stderr[-1500:]}")
    return r


# ---------------------------------------------------------------- etapas
def gen_images():
    for s in SCENES:
        if s["kind"] != "image":
            continue
        dest = os.path.join(IMG, s["id"] + ".png")
        if os.path.exists(dest) and os.path.getsize(dest) > 20000:
            print(f"  ya existe {s['id']}.png")
            continue
        st, body = post(
            "/v1/image_generation",
            {
                "model": "image-01",
                "prompt": s["prompt"],
                "width": 1920,
                "height": 1080,
                "n": 1,
                "response_format": "url",
                "prompt_optimizer": True,
            },
        )
        if st != 200:
            print(f"  FALLO {s['id']}: {st} {body[:200]}")
            continue
        d = json.loads(body)
        urls = (d.get("data") or {}).get("image_urls") or []
        if not urls:
            print(f"  FALLO {s['id']}: sin url {json.dumps(d)[:200]}")
            continue
        with urllib.request.urlopen(urls[0], timeout=120) as r:
            raw = r.read()
        open(dest, "wb").write(raw)
        print(f"  OK {s['id']}.png ({len(raw)//1024} KB)")


VOICES = ["Spanish_Narrator", "Spanish_SophisticatedLady", "Spanish_ReservedYoungMan", "Spanish_ConfidentWoman"]
VOICE = "Spanish_Narrator"
# Locución "tipo doblaje": español forzado + normalización de calidad + pronunciación
# explícita de la marca (si el modelo rechaza el diccionario, se reintenta sin él).
TTS_BASE = {
    "language_boost": "Spanish",
    "text_normalization_mode": "quality",
}
TTS_PRON = {"tone": ["IronKey/(ˈai̯ɾon kei)"]}


def tts_payload(text, voice):
    return {
        "model": "speech-2.8-hd",
        "text": text,
        "stream": False,
        "language_boost": TTS_BASE["language_boost"],
        "text_normalization_mode": TTS_BASE["text_normalization_mode"],
        "pronunciation_dict": TTS_PRON,
        "voice_setting": {"voice_id": voice, "speed": 1.06, "vol": 1.0, "pitch": 0},
        "audio_setting": {"sample_rate": 32000, "bitrate": 128000, "format": "mp3", "channel": 1},
    }


def synth(text, voice):
    """Devuelve bytes mp3 o None."""
    for payload in (tts_payload(text, voice), {**tts_payload(text, voice), "pronunciation_dict": {}}):
        st, body = post("/v1/t2a_v2", payload)
        if st != 200:
            continue
        hexs = (json.loads(body).get("data") or {}).get("audio", "")
        if len(hexs) < 2000:
            continue
        return bytes.fromhex(hexs)
    return None


def gen_audition():
    """La misma frase en 4 voces ES: el owner elige el tono."""
    out = os.path.join(OUT, "audition")
    os.makedirs(out, exist_ok=True)
    line = (
        "IronKey: un gestor de contraseñas cifradas, en la web, con planes. "
        "Usas la misma contraseña en todas tus cuentas y eso es lo que un atacante quiere."
    )
    files = []
    for v in VOICES:
        raw = synth(line, v)
        if not raw:
            print(f"  FALLO {v}")
            continue
        f = os.path.join(out, v + ".mp3")
        open(f, "wb").write(raw)
        files.append(f)
        print(f"  OK {v}.mp3 ({len(raw)//1024} KB, {probe_duration(f):.1f}s)")
    if files:
        lst = os.path.join(out, "concat.txt")
        with open(lst, "w") as fh:
            for f in files:
                fh.write(f"file '{f}'\n")
        reel = os.path.join(out, "audicion.mp3")
        run([FF, "-y", "-f", "concat", "-safe", "0", "-i", lst, "-c", "copy", reel])
        print(f"  OK audicion.mp3 (orden: {', '.join(VOICES)})")


def gen_vo():
    for s in SCENES:
        dest = os.path.join(VO, s["id"] + ".mp3")
        if os.path.exists(dest) and os.path.getsize(dest) > 1000:
            print(f"  ya existe {s['id']}.mp3")
            continue
        raw = synth(s["vo"], VOICE)
        if not raw:
            print(f"  FALLO {s['id']} con {VOICE}")
            for v in VOICES:
                if v == VOICE:
                    continue
                raw = synth(s["vo"], v)
                if raw:
                    print(f"  fallback {v}")
                    break
        if not raw:
            print(f"  FALLO definitivo {s['id']}")
            continue
        open(dest, "wb").write(raw)
        print(f"  OK {s['id']}.mp3 voz={VOICE} ({len(raw)//1024} KB, {probe_duration(dest):.1f}s)")


def gen_music(total_dur):
    """Pad ambiental sintetizado (sin copyright: osciladores numpy)."""
    import numpy as np

    dest = os.path.join(OUT, "music.wav")
    if os.path.exists(dest) and abs(probe_duration(dest) - total_dur) < 2:
        print("  ya existe music.wav")
        return dest
    sr = 44100
    n = int(sr * total_dur)
    t = np.arange(n) / sr
    rng = np.random.default_rng(7)
    noise = rng.normal(0, 1, n)
    k = 400
    smooth = np.convolve(noise, np.ones(k) / k, mode="same")  # ruido grave
    pad = (
        0.55 * np.sin(2 * np.pi * 55.0 * t)
        + 0.32 * np.sin(2 * np.pi * 110.0 * t + 0.4)
        + 0.16 * np.sin(2 * np.pi * 164.8 * t + 1.1)
        + 0.10 * np.sin(2 * np.pi * 220.0 * t + 2.3)
    )
    trem = 0.72 + 0.28 * np.sin(2 * np.pi * 0.06 * t)
    air = 0.22 * smooth * (0.5 + 0.5 * np.sin(2 * np.pi * 0.03 * t))
    mix = (pad * trem + air) * 0.5
    fade_in = np.clip(t / 2.5, 0, 1)
    fade_out = np.clip((total_dur - t) / 3.0, 0, 1)
    mix = mix * fade_in * fade_out
    mix = mix / (np.max(np.abs(mix)) + 1e-9) * 0.85
    pcm = (mix * 32767).astype("<i2")
    with wave.open(dest, "wb") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(sr)
        w.writeframes(pcm.tobytes())
    print(f"  OK music.wav ({total_dur:.1f}s)")
    return dest


def write_ass(scene, dur):
    """Subtítulos ASS para el titular: una caja translúcida con título + bajada.
    (El build de ffmpeg no trae drawtext, pero sí libass.)"""
    align = scene.get("align", 7)
    pos = scene.get("pos", (140, 840))
    style = (
        "Style: Cap,DejaVu Sans,62,&H00FFFFFF,&H000000FF,&H00101010,&H64000000,"
        f"-1,0,0,0,100,100,0.4,0,1,3,2,{align},0,0,0,1"
    )
    txt = (
        "{\\an%d\\pos(%d,%d)\\bord3\\shad2}%s\\N{\\fs34\\c&H00B8A394&\\bord2\\shad1}%s"
        % (align, pos[0], pos[1], scene["title"], scene["sub"])
    )
    ass = (
        "[Script Info]\nScriptType: v4.00+\nPlayResX: 1920\nPlayResY: 1080\n"
        "WrapStyle: 2\nScaledBorderAndShadow: yes\n\n"
        "[V4+ Styles]\nFormat: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, "
        "OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, "
        "Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding\n"
        f"{style}\n\n"
        "[Events]\nFormat: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text\n"
        f"Dialogue: 0,0:00:00.00,0:00:{dur:06.2f},Cap,,0,0,0,,{txt}\n"
    )
    path = os.path.join(OUT, scene["id"] + ".ass")
    open(path, "w").write(ass)
    return path


def compute_durations():
    for s in SCENES:
        vo = os.path.join(VO, s["id"] + ".mp3")
        vo_dur = probe_duration(vo) if os.path.exists(vo) else 0.0
        s["_dur"] = round(max(s["min_dur"], vo_dur + 0.4), 2)


def build_clips():
    compute_durations()
    for s in SCENES:
        dest = os.path.join(CLIP, s["id"] + ".mp4")
        vo = os.path.join(VO, s["id"] + ".mp3")
        dur = s["_dur"]
        s["_dur"] = round(dur, 2)

        if os.path.exists(dest) and abs(probe_duration(dest) - dur) < 0.2:
            print(f"  ya existe {s['id']}.mp4")
            continue

        focus_y = s.get("focus_y", 0.5)
        if s.get("crop"):
            # recorte exacto de un elemento del dashboard + lienzo con banda de texto
            cx, cy, cw, ch = s["crop"]
            content_h = s.get("content_h", 820)
            pad_y = s.get("pad_y", 0)
            src = os.path.join(OUT, "screen", s["src"])
            if not os.path.exists(src):
                print(f"  FALLO {s['id']}: falta captura {s['src']}")
                continue
            pre = (
                f"crop={cw}:{ch}:{cx}:{cy},"
                f"scale=1920:{content_h}:force_original_aspect_ratio=decrease,"
                f"pad=1920:1080:-1:{pad_y}:color=0x0b0d10"
            )
            zmax = s.get("zoom", 1.04)
            step = (zmax - 1.0) / max(dur * FPS, 1)
            zoom = f"min(zoom+{step:.7f},{zmax})"
        elif s["kind"] == "image":
            src = os.path.join(IMG, s["id"] + ".png")
            if not os.path.exists(src):
                print(f"  FALLO {s['id']}: falta imagen")
                continue
            zmax = s.get("zoom", 1.12)
            step = (zmax - 1.0) / max(dur * FPS, 1)
            zoom = f"min(zoom+{step:.7f},{zmax})"
            pre = ""  # tamaño nativo: el zoompan hace downscale, nunca upscale
        else:
            src = os.path.join(OUT, "screen", s["src"])
            if not os.path.exists(src):
                print(f"  FALLO {s['id']}: falta captura {s['src']}")
                continue
            zmax = s.get("zoom", 1.05)
            step = (zmax - 1.0) / max(dur * FPS, 1)
            zoom = f"min(zoom+{step:.7f},{zmax})"
            pre = f"scale=2560:1440:force_original_aspect_ratio=increase,crop=2560:1440"

        ass = write_ass(s, dur)

        vf = (
            f"[0:v]{pre + ',' if pre else ''}"
            f"zoompan=z='{zoom}':x='iw/2-(iw/zoom/2)':y='ih*{focus_y}-(ih/zoom/2)':d=1:s={W}x{H}:fps={FPS},"
            f"vignette=PI/4.5,"
            f"ass='{ass}',noise=alls=1.6:allf=t+u,"
            f"fade=t=in:st=0:d=0.55,fade=t=out:st={dur - 0.45:.2f}:d=0.45,format=yuv420p[v]"
        )
        run(
            [
                FF, "-y", "-loop", "1", "-i", src, "-t", f"{dur}",
                "-filter_complex", vf, "-map", "[v]",
                "-c:v", "libx264", "-preset", "medium", "-crf", "19",
                "-r", str(FPS), "-pix_fmt", "yuv420p", dest,
            ]
        )
        print(f"  OK {s['id']}.mp4 ({dur}s)")


def assemble():
    compute_durations()
    clips = [os.path.join(CLIP, s["id"] + ".mp4") for s in SCENES]
    missing = [c for c in clips if not os.path.exists(c)]
    if missing:
        print("  faltan clips:", [os.path.basename(m) for m in missing])
        return
    total = sum(s["_dur"] for s in SCENES)
    music = gen_music(total)

    listf = os.path.join(OUT, "concat.txt")
    with open(listf, "w") as f:
        for c in clips:
            f.write(f"file '{c}'\n")
    vcat = os.path.join(OUT, "_video.mp4")
    run([FF, "-y", "-f", "concat", "-safe", "0", "-i", listf, "-c", "copy", vcat])

    # audio: VO con delay por plano + música de fondo
    inputs, filters = [], []
    for i, s in enumerate(SCENES):
        vo = os.path.join(VO, s["id"] + ".mp3")
        start = sum(x["_dur"] for x in SCENES[:i])
        inputs += ["-i", vo]
        filters.append(f"[{i + 1}:a]aresample=48000,aformat=sample_fmts=fltp:channel_layouts=stereo,adelay={int(start*1000)}|{int(start*1000)}[v{i}]")
        labels = f"[v{i}]"
    n = len(SCENES)
    inputs += ["-i", music]
    filters.append(f"[{n + 1}:a]aresample=48000,aformat=sample_fmts=fltp:channel_layouts=stereo,volume=0.085[m]")
    mix_in = "".join(f"[v{i}]" for i in range(n)) + f"[m]"
    filters.append(
        f"{mix_in}amix=inputs={n + 1}:normalize=0[mix];"
        f"[mix]apad,atrim=0:{total:.2f},loudnorm=I=-16:TP=-1.5:LRA=11[a]"
    )

    out = os.path.join(OUT, "promo.mp4")
    run(
        [FF, "-y", "-i", vcat]
        + inputs
        + ["-filter_complex", ";".join(filters), "-map", "0:v", "-map", "[a]",
           "-c:v", "copy", "-c:a", "aac", "-b:a", "192k", "-shortest", out]
    )
    print(f"  OK promo.mp4  dur={probe_duration(out):.1f}s  {os.path.getsize(out)//1024} KB")

    # versión vertical 9:16 para redes: master 16:9 centrado sobre fondo desenfocado
    v9 = os.path.join(OUT, "promo_9x16.mp4")
    run(
        [FF, "-y", "-i", out,
         "-filter_complex",
         "[0:v]split=2[fg][bg];"
         "[fg]scale=1080:608:flags=lanczos[front];"
         "[bg]scale=24:43:flags=bilinear,scale=1080:1920:flags=bicubic,eq=brightness=-0.12:saturation=0.85[back];"
         "[back][front]overlay=(W-w)/2:(H-h)/2:format=auto,format=yuv420p[v]",
         "-map", "[v]", "-map", "0:a", "-c:v", "libx264", "-preset", "medium", "-crf", "20",
         "-c:a", "aac", "-b:a", "192k", v9]
    )
    print(f"  OK promo_9x16.mp4 {os.path.getsize(v9)//1024} KB")


def main():
    ensure_dirs()
    stage = sys.argv[1] if len(sys.argv) > 1 else "all"
    if stage in ("images", "all"):
        print("== keyframes ==")
        gen_images()
    if stage in ("vo", "all"):
        print("== voz en off ==")
        gen_vo()
    if stage == "audition":
        print("== audicion de voces ==")
        gen_audition()
    if stage in ("clips", "all"):
        print("== clips ==")
        build_clips()
    if stage in ("assemble", "all"):
        print("== ensamblado ==")
        assemble()
    print("listo.")


if __name__ == "__main__":
    main()
