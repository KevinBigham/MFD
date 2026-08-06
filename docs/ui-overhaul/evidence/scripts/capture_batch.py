from __future__ import annotations
import argparse,json,re,threading,time
from http.server import ThreadingHTTPServer,SimpleHTTPRequestHandler
from pathlib import Path
from functools import partial
from playwright.sync_api import sync_playwright
ROOT=Path('/mnt/data/mfd_uiux_audit_work/MFD-main');AUDIT=ROOT/'docs/ui-overhaul';OUT=AUDIT/'evidence/runtime';OUT.mkdir(parents=True,exist_ok=True)
WWW=Path('/mnt/data/mfd_uiux_audit_work/runtime/www');(WWW/'MFD').parent.mkdir(parents=True,exist_ok=True)
if (WWW/'MFD').exists() or (WWW/'MFD').is_symlink():(WWW/'MFD').unlink()
(WWW/'MFD').symlink_to(ROOT/'apps/web/dist',target_is_directory=True)
BASE='http://127.0.0.1:8765/MFD/'
VPS1=[(320,568,'phone-320x568'),(360,800,'phone-360x800'),(390,844,'phone-390x844'),(430,932,'phone-430x932'),(667,375,'landscape-667x375'),(844,390,'landscape-844x390'),(932,430,'landscape-932x430')]
VPS2=[(768,1024,'tablet-768x1024'),(1024,768,'tablet-1024x768'),(1280,720,'desktop-1280x720'),(1440,900,'desktop-1440x900'),(1600,1000,'desktop-1600x1000')]
ROUTES=[('briefing','/'),('roster','/roster'),('depth-chart','/depth-chart'),('contracts','/contracts'),('trades','/trades'),('game-plan','/game-plan'),('game-day','/game-day'),('week-advance','/week-advance'),('standings','/standings'),('analytics','/analytics'),('franchise','/franchise'),('save-load','/dynasty'),('settings','/settings')]
METRIC=r'''() => { const de=document.documentElement,b=document.body,m=document.querySelector('main'),vh=innerHeight,vw=innerWidth;const all=[...document.querySelectorAll('*')];const vis=all.filter(e=>{const s=getComputedStyle(e),r=e.getBoundingClientRect();return s.display!=='none'&&s.visibility!=='hidden'&&r.width>0&&r.height>0});const ints=[...document.querySelectorAll('button,a[href],input,select,textarea,[role="button"],[tabindex]:not([tabindex="-1"])')].filter(e=>{const s=getComputedStyle(e),r=e.getBoundingClientRect();return s.display!=='none'&&s.visibility!=='hidden'&&r.width>0&&r.height>0});const fixed=vis.filter(e=>['fixed','sticky'].includes(getComputedStyle(e).position));const scroll=vis.filter(e=>{const s=getComputedStyle(e);return /(auto|scroll)/.test(s.overflow+s.overflowY+s.overflowX)&&(e.scrollHeight>e.clientHeight+2||e.scrollWidth>e.clientWidth+2)});const small=vis.filter(e=>(e.textContent||'').trim()&&parseFloat(getComputedStyle(e).fontSize)<12);const border=vis.filter(e=>{const s=getComputedStyle(e);return parseFloat(s.borderTopWidth)+parseFloat(s.borderRightWidth)+parseFloat(s.borderBottomWidth)+parseFloat(s.borderLeftWidth)>0});const primary=ints.filter(e=>/(advance|start|continue|launch|confirm|play|simulate|set game plan|required|resolve)/i.test((e.getAttribute('aria-label')||'')+' '+(e.textContent||''))).map(e=>{const r=e.getBoundingClientRect();return{text:(e.getAttribute('aria-label')||e.textContent||'').trim().replace(/\s+/g,' ').slice(0,100),top:Math.round(r.top),width:Math.round(r.width),height:Math.round(r.height),aboveFold:r.top<vh&&r.bottom>0}}).slice(0,20);return{url:location.href,viewport:{width:vw,height:vh},document:{scrollWidth:de.scrollWidth,scrollHeight:de.scrollHeight},body:{scrollWidth:b.scrollWidth,scrollHeight:b.scrollHeight},main:m?{top:Math.round(m.getBoundingClientRect().top),height:Math.round(m.getBoundingClientRect().height),scrollHeight:m.scrollHeight}:null,horizontalOverflow:de.scrollWidth>vw+2,counts:{visibleElements:vis.length,interactive:ints.length,aboveFoldInteractive:ints.filter(e=>{const r=e.getBoundingClientRect();return r.top<vh&&r.bottom>0}).length,targetsBelow44:ints.filter(e=>{const r=e.getBoundingClientRect();return r.width<44||r.height<44}).length,targetsBelow24:ints.filter(e=>{const r=e.getBoundingClientRect();return r.width<24||r.height<24}).length,smallTextBelow12:small.length,borderedElements:border.length,fixedOrSticky:fixed.length,scrollContainers:scroll.length,tables:document.querySelectorAll('table').length,rows:document.querySelectorAll('tr').length,headings:document.querySelectorAll('h1,h2,h3,h4,h5,h6').length},primaryActions:primary,chrome:fixed.slice(0,16).map(e=>{const r=e.getBoundingClientRect();return{tag:e.tagName,className:String(e.className||'').slice(0,100),top:Math.round(r.top),height:Math.round(r.height),text:(e.textContent||'').trim().replace(/\s+/g,' ').slice(0,70)}}),text:(b.innerText||'').slice(0,2500)}}'''
class Quiet(SimpleHTTPRequestHandler):
 def log_message(self,*args):pass
def load():
 p=AUDIT/'BASELINE_MEASUREMENTS.json'
 if p.exists():return json.loads(p.read_text())
 return {'metadata':{'baseUrl':BASE,'runtimeSource':'repository existing apps/web/dist','externalRequests':'aborted; fallback fonts rendered','notes':['Fresh Vite build blocked in Linux by archive-installed macOS Rollup optional binary.']},'states':{},'viewportMatrix':[],'routeMatrix':[],'errors':[]}
def save(d):
 (AUDIT/'BASELINE_MEASUREMENTS.json').write_text(json.dumps(d,indent=2));(AUDIT/'evidence/data/runtime-measurements.json').write_text(json.dumps(d,indent=2))
def abort(route):
 if route.request.url.startswith('http') and '127.0.0.1:8765' not in route.request.url:route.abort()
 else:route.continue_()
def enter(p):
 p.goto(BASE,wait_until='domcontentloaded',timeout=10000)
 for _ in range(14):
  p.keyboard.press('Enter');p.wait_for_timeout(180)
  if 'NEW DYNASTY' in p.locator('body').inner_text().upper():return
 raise RuntimeError('new game not reached')
def demo(p):
 enter(p);p.get_by_role('button',name=re.compile('LAUNCH DEMO SCENARIO',re.I)).click(timeout=4000)
 for _ in range(30):
  p.wait_for_timeout(180)
  if 'ACTION CENTER' in p.locator('body').inner_text().upper():return
 raise RuntimeError('demo not reached')
def take(p,label,route,vlabel,full=False):
 x=p.evaluate(METRIC);x.update(label=label,route=route,viewportLabel=vlabel,capturedAt=time.strftime('%Y-%m-%dT%H:%M:%SZ',time.gmtime()));name=f'{label}--{vlabel}.png';p.screenshot(path=str(OUT/name),full_page=full);x['screenshot']=f'evidence/runtime/{name}';return x
def main(mode):
 server=ThreadingHTTPServer(('127.0.0.1',8765),partial(Quiet,directory=str(WWW)));threading.Thread(target=server.serve_forever,daemon=True).start();d=load()
 with sync_playwright() as pw:
  b=pw.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--disable-dev-shm-usage']);c=b.new_context(viewport={'width':390,'height':844},has_touch=True);p=c.new_page();p.route('**/*',abort)
  try:
   if mode=='entry':
    p.goto(BASE,wait_until='domcontentloaded',timeout=10000);p.wait_for_timeout(300);d['states']['cold-open']=take(p,'cold-open','/','phone-390x844');save(d);enter(p);d['states']['new-game']=take(p,'new-game','/','phone-390x844');save(d);p.get_by_role('button',name=re.compile('START GUIDED',re.I)).click(timeout=3000);p.wait_for_timeout(300);d['states']['guided-setup']=take(p,'guided-setup','setup','phone-390x844');save(d)
   elif mode.startswith('viewports'):
    demo(p);subset=VPS1 if mode=='viewports1' else VPS2;existing={x['viewportLabel']:x for x in d['viewportMatrix']}
    for w,h,label in subset:
     p.set_viewport_size({'width':w,'height':h});p.evaluate("location.hash='#/'");p.wait_for_timeout(120);p.evaluate('scrollTo(0,0)');existing[label]=take(p,'briefing','/',label);d['viewportMatrix']=[existing[k] for k in [x[2] for x in VPS1+VPS2] if k in existing];save(d)
    if mode=='viewports1':
     p.set_viewport_size({'width':390,'height':844});p.evaluate("location.hash='#/'");p.wait_for_timeout(120);p.get_by_role('button',name=re.compile('MORE',re.I)).last.click(timeout=2000);p.wait_for_timeout(120);d['states']['more-drawer']=take(p,'more-drawer','/','phone-390x844');save(d)
   else:
    demo(p);w,h,vlabel=(390,844,'phone-390x844') if mode=='routes-mobile' else (1440,900,'desktop-1440x900');p.set_viewport_size({'width':w,'height':h});existing={(x['viewportLabel'],x['route']):x for x in d['routeMatrix']}
    for label,r in ROUTES:
     if (vlabel,r) in existing: continue
     p.evaluate("r=>location.hash='#'+r",r);p.wait_for_timeout(180);p.evaluate('scrollTo(0,0)');existing[(vlabel,r)]=take(p,label,r,vlabel);d['routeMatrix']=[existing[k] for k in sorted(existing)];save(d)
  except Exception as e:d['errors'].append({'mode':mode,'error':repr(e)});save(d);raise
  finally:b.close()
 server.shutdown();print(json.dumps({'mode':mode,'states':len(d['states']),'viewports':len(d['viewportMatrix']),'routes':len(d['routeMatrix']),'errors':d['errors']},indent=2))
if __name__=='__main__':a=argparse.ArgumentParser();a.add_argument('mode',choices=['entry','viewports1','viewports2','routes-mobile','routes-desktop']);main(a.parse_args().mode)
