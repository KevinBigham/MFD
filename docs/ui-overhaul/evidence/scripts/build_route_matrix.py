from pathlib import Path
import re,csv,json
root=Path('/mnt/data/mfd_uiux_audit_work/MFD-main')
text=(root/'packages/engine/src/config/route-registry.ts').read_text()
pat=re.compile(r"route\('([^']+)',\s*'([^']+)',\s*'([^']+)',\s*'([^']+)',\s*'([^']+)'([^\n]*)\),")
routes=[]
for m in pat.finditer(text):
 p,l,s,room,nerd,opts=m.groups(); uw='always'; up=''
 x=re.search(r"unlockWeek:\s*(?:'([^']+)'|(\d+))",opts); y=re.search(r"unlockPhase:\s*'([^']+)'",opts)
 if x: uw=x.group(1) or x.group(2)
 if y: up=y.group(1)
 routes.append(dict(path=p,label=l,short=s,room=room,nerd=nerd,unlock_week=uw,unlock_phase=up))
assert len(routes)==79
# hub, future path, target surface, placement, job, lifecycle, frequency, urgency
spec={
'/':('Today','/today','phase-aware hub','Today overview','Understand the week and choose the next meaningful action','all','every session','critical'),
'/week-advance':('Today','/today?panel=readiness','drawer or bottom sheet','sticky gated Advance control','Confirm readiness, understand consequences, and advance safely','all','weekly','critical'),
'/inbox':('Today','/today/inbox','hub tab or section','Today > Inbox','Review actionable messages and decisions','all','frequent','high'),
'/watch-list':('Today','/today/watchlist','hub tab or section','Today > Watchlist','Track players, games, and items for later','all','frequent','medium'),
'/roster':('Team','/team/roster','collection/list with filters','Team default','Scan and manage the roster','all','very frequent','high'),
'/depth-chart':('Team','/team/depth','hub tab or section','Team > Depth','Set roles and lineup order','preseason / regular season','very frequent','critical when blocked'),
'/locker-room':('Team','/team/culture','hub tab or section','Team > Culture','Understand morale and chemistry','all','weekly','medium'),
'/coaching':('Team','/team/staff','phase-aware hub','Team > Staff','Manage coaching staff','all','periodic','medium'),
'/coaching/tree':('Team','/team/staff/tree','hub tab or section','Team > Staff > Tree','Review coaching lineage and progression','all','occasional','low'),
'/coaching/relationships':('Team','/team/staff/relationships','hub tab or section','Team > Staff > Relationships','Review staff relationships','all','periodic','medium'),
'/handshakes':('Team','/team/commitments','hub tab or section','Team > Culture > Commitments','Track promises and commitments','all','weekly','high when due'),
'/training-camp':('Team','/team/camp','contextual workflow','phase takeover + Team tab','Run camp decisions and evaluations','training camp','phase-dominant','critical'),
'/mentors':('Team','/team/development/mentors','hub tab or section','Team > Development > Mentors','Assign alumni mentors','all','occasional','medium'),
'/player-development':('Team','/team/development','phase-aware hub','Team > Development','Plan and review development','all','weekly','high'),
'/compare':('Team','/team/compare','comparison workbench','contextual entity action','Compare selected players','all','contextual','medium'),
'/rivalries':('Team','/team/culture/rivalries','hub tab or section','Team > Culture > Rivalries','Review player rivalries','all','occasional','low'),
'/contracts':('Office','/office/finance/contracts','hub tab or section','Office > Finance > Contracts','Manage contracts and financial commitments','all','frequent','high'),
'/cap-lab':('Office','/office/finance/cap-lab','comparison/transaction workbench','Office > Finance > Cap Lab','Model cap scenarios','all','periodic','medium'),
'/front-office':('Office','/office/operations','phase-aware hub','Office > Operations','Review front-office strategy and operations','all','weekly','medium'),
'/endorsements':('Office','/office/operations/endorsements','hub tab or section','Office > Operations > Endorsements','Manage commercial opportunities','all','occasional','low'),
'/trades':('Office','/office/personnel/trades','comparison/transaction workbench','Office > Personnel > Trades','Build, assess, and execute trades','regular season / offseason','periodic','high when active'),
'/trade-block':('Office','/office/personnel/trade-market','hub tab or section','Office > Personnel > Market','Review market availability and offers','regular season','weekly','medium'),
'/trade-deadline':('Office','/office/personnel/deadline','contextual workflow','deadline phase takeover + Today task','Resolve trade-deadline decisions','trade deadline','phase-dominant','critical'),
'/team-needs':('Office','/office/personnel/needs','hub tab or section','Office > Personnel > Needs','Identify roster needs','all','weekly','high'),
'/scouting':('Office','/office/personnel/scouting','phase-aware hub','Office > Personnel > Scouting','Evaluate prospects and targets','midseason / offseason','frequent in phase','high'),
'/draft':('Office','/office/personnel/draft','decision workflow or wizard','draft phase takeover + Office tab','Run draft preparation and selections','draft','phase-dominant','critical'),
'/draft-recap':('Office','/office/personnel/draft/recap','event-driven presentation','draft completion + archive','Review draft outcomes','post-draft','once per season','medium'),
'/expansion-draft':('Office','/office/personnel/expansion-draft','decision workflow or wizard','event-driven Office workflow','Run expansion-draft decisions','expansion event','rare','critical when active'),
'/free-agency':('Office','/office/personnel/free-agency','comparison/transaction workbench','free-agency takeover + Office tab','Evaluate and sign free agents','free agency','phase-dominant','critical'),
'/fa-targets':('Office','/office/personnel/free-agency/targets','hub tab or section','Free Agency > Targets','Manage the target board','free agency','frequent in phase','high'),
'/waivers':('Office','/office/personnel/waivers','hub tab or section','Office > Personnel > Waivers','Review and claim waived players','regular season','weekly','medium'),
'/practice-squad':('Team','/team/roster/practice-squad','hub tab or section','Team > Roster > Practice Squad','Manage practice-squad players','regular season','weekly','medium'),
'/owner':('Office','/office/ownership','hub tab or section','Office > Ownership','Review owner expectations and relationship','all','periodic','high when triggered'),
'/relocate':('Office','/office/ownership/relocation','decision workflow or wizard','Office > Ownership > Relocation','Evaluate or execute relocation','offseason / special event','rare','high when active'),
'/game-plan':('Game','/game/plan','hub tab or section','Game > Plan + Today task','Prepare tactical choices for the next opponent','regular season / playoffs','weekly','critical'),
'/game-day':('Game','/game/current','event-driven presentation','Game Center overview','Enter the current game experience','game day','weekly','critical'),
'/broadcast':('Game','/game/current/broadcast','hub tab or section','Game Center > Broadcast','Watch the broadcast presentation','game day / postgame','weekly','medium'),
'/presentation':('Game','/game/current/presentation','hub tab or section','Game Center > Presentation','View cinematic game presentation','game day / postgame','weekly','medium'),
'/play-by-play':('Game','/game/current/play-by-play','hub tab or section','Game Center > Play-by-Play','Read the game event log','game day / postgame','weekly','medium'),
'/game-flow':('Game','/game/current/flow','hub tab or section','Game Center > Flow','Analyze momentum and drives','postgame','weekly','medium'),
'/film-room':('Game','/game/current/film','hub tab or section','Game Center > Film','Review tactical and player lessons','postgame','weekly','high'),
'/schedule':('Game','/game/schedule','hub tab or section','Game > Schedule','Review past and future games','all','frequent','medium'),
'/super-bowl':('Game','/game/super-bowl','event-driven presentation','championship takeover + archive','Experience the championship event','Super Bowl','rare','critical when active'),
'/standings':('League','/league/standings','hub tab or section','League default','Understand league position','regular season / playoffs','weekly','high'),
'/power-rankings':('League','/league/rankings','hub tab or section','League > Rankings','Review comparative team strength','midseason onward','weekly','medium'),
'/league-pulse':('League','/league/pulse','timeline/news/history view','League > Pulse','Scan major league changes','all','weekly','medium'),
'/league/weather':('League','/league/weather','hub tab or section','League > Context > Weather','Review weather and game impacts','regular season','weekly','low'),
'/newsroom':('League','/league/news','timeline/news/history view','League > News','Review curated league digest','all','weekly','medium'),
'/news':('League','/league/news/all','hub tab or section','League > News > All','Browse complete league news','all','frequent','medium'),
'/social':('League','/league/news/mfsn','hub tab or section','League > News > MFSN','Review MFSN social chatter','all','frequent','low'),
'/commissioner':('League','/league/governance/commissioner','hub tab or section','League > Governance','Review commissioner actions','all','occasional','medium'),
'/cba':('League','/league/governance/cba','decision workflow or wizard','event-driven governance workflow','Manage collective-bargaining events','CBA event','rare','critical when active'),
'/league-rules':('League','/league/governance/rules','hub tab or section','League > Governance > Rules','Review rule configuration and effects','all','occasional','low'),
'/analytics':('League','/league/analytics','data dashboard and analytics view','League > Analytics','Analyze league and team performance','all','periodic','medium'),
'/records':('League','/league/history/records','archive/history detail','League > History > Records','Review historical records','all','occasional','low'),
'/stat-central':('League','/league/stats','collection/list with filters','League > Stats','Explore detailed statistics','all','frequent','medium'),
'/franchise':('Dynasty','/dynasty/overview','phase-aware hub','Dynasty overview','Understand franchise identity and long-term arc','all','periodic','medium'),
'/legends':('Dynasty','/dynasty/legends','archive/history detail','Dynasty > Legends','Review franchise legends','all','occasional','low'),
'/franchise/career':('Dynasty','/dynasty/career','data dashboard and analytics view','Dynasty > Career','Review the GM career','all','periodic','medium'),
'/franchise/book':('Dynasty','/dynasty/book','archive/history detail','Dynasty > Archive > Book','Browse the franchise book','all','occasional','low'),
'/franchise/chronicle':('Dynasty','/dynasty/chronicle','timeline/news/history view','Dynasty > Archive > Chronicle','Browse the franchise chronicle','all','occasional','low'),
'/franchise/scrapbook':('Dynasty','/dynasty/scrapbook','archive/history detail','Dynasty > Archive > Scrapbook','Browse saved franchise moments','all','occasional','low'),
'/franchise/hall':('Dynasty','/dynasty/hall-of-fame','archive/history detail','Dynasty > Honors > Hall of Fame','Review the franchise Hall of Fame','all','occasional','low'),
'/franchise/trophy-room':('Dynasty','/dynasty/trophies','archive/history detail','Dynasty > Honors > Trophies','Review championships and trophies','all','occasional','medium'),
'/franchise/eras':('Dynasty','/dynasty/eras','timeline/news/history view','Dynasty > History > Eras','Review franchise eras','multi-season','occasional','low'),
'/franchise/mvps':('Dynasty','/dynasty/honors/mvps','archive/history detail','Dynasty > Honors > MVPs','Review MVP plaques','all','occasional','low'),
'/franchise/playoff-lore':('Dynasty','/dynasty/history/playoffs','archive/history detail','Dynasty > History > Playoffs','Review playoff history and lore','all','occasional','low'),
'/franchise/achievements':('Dynasty','/dynasty/achievements','data dashboard and analytics view','Dynasty > Achievements','Review achievement progress','all','periodic','medium'),
'/legacy':('Dynasty','/dynasty/legacy','hub tab or section','Dynasty > Legacy','Review overall dynasty legacy','multi-season','periodic','medium'),
'/legacy/named-games':('Dynasty','/dynasty/history/named-games','archive/history detail','Dynasty > History > Named Games','Review named historic games','multi-season','occasional','low'),
'/legacy/bloodlines':('Dynasty','/dynasty/history/bloodlines','archive/history detail','Dynasty > History > Bloodlines','Review player and coaching bloodlines','multi-season','occasional','low'),
'/awards':('Dynasty','/dynasty/honors/awards','archive/history detail','Dynasty > Honors > Awards','Review awards and honors','all','periodic','medium'),
'/season/recap':('Dynasty','/dynasty/seasons/current/recap','event-driven presentation','season-completion event + archive','Review the completed season story','season end','once per season','high'),
'/scenarios':('Dynasty','/scenarios','collection/list with filters','Title screen + Dynasty > Challenges','Start or review scenario challenges','title / all','occasional','low'),
'/about':('System','/system/about','system/settings utility','System sheet > About','Read product information','all','rare','low'),
'/credits':('System','/system/credits','system/settings utility','System sheet > Credits','Read credits','all','rare','low'),
'/faq':('System','/help','system/settings utility','Help search + System sheet','Find help and explanations','all','occasional','medium'),
'/dynasty':('System','/system/saves','settings and trust-critical utility','System sheet > Saves','Save, load, import, export, and recover','all','periodic','critical'),
'/settings':('System','/system/settings','settings and trust-critical utility','System sheet > Settings','Configure gameplay, display, input, and accessibility','all','periodic','medium'),
}
assert set(spec)=={r['path'] for r in routes}, (set(r['path'] for r in routes)-set(spec),set(spec)-set(r['path'] for r in routes))
fields=['current_path','current_label','current_short_label','current_room','current_nerd_group','unlock_week','unlock_phase','user_job','lifecycle_phase','frequency','urgency','current_surface_type','current_entry_points','current_back_return_behavior','current_discoverability','current_mobile_usability','current_scroll_burden','overlap_or_ambiguity','belongs_in_permanent_nav','recommended_parent_hub','recommended_canonical_path','recommended_surface_type','recommended_placement','route_compatibility','feature_loss_risk','required_acceptance_test']
out=[]
for r in routes:
 p=r['path']; hub,future,surface,placement,job,phase,freq,urg=spec[p]
 current_type='global destination'
 if p in ['/week-advance','/trades','/trade-deadline','/draft','/free-agency','/relocate','/cba','/training-camp']: current_type='workflow exposed as global route'
 if p in ['/broadcast','/presentation','/play-by-play','/game-flow','/film-room','/draft-recap','/season/recap','/super-bowl']: current_type='presentation/detail exposed as global route'
 if p in ['/about','/credits','/faq','/dynasty','/settings']: current_type='system utility inside Legacy room'
 overlap='none uniquely identified'
 if p in ['/','/week-advance','/inbox','/watch-list']: overlap='Briefing, Action Center, Inbox, Watch List, Chip, badges, and readiness compete to explain next actions'
 elif p in ['/game-day','/broadcast','/presentation','/play-by-play','/game-flow','/film-room']: overlap='Several routes are views of the same game object and result loop'
 elif p in ['/newsroom','/news','/social','/league-pulse']: overlap='League-awareness feeds have weakly communicated boundaries'
 elif hub=='Dynasty': overlap='Many archive routes compete without one emotionally coherent Dynasty hierarchy'
 elif p in ['/contracts','/cap-lab','/front-office']: overlap='Related finance and front-office jobs are peer global destinations'
 elif p in ['/trades','/trade-block','/trade-deadline','/team-needs','/scouting','/draft','/draft-recap','/free-agency','/fa-targets','/waivers']: overlap='The acquisition lifecycle is fragmented across many peer destinations'
 perm='no'
 if p=='/': perm='yes — Today'
 elif p=='/roster': perm='yes — Team'
 elif p=='/game-day': perm='yes — Game'
 elif p=='/front-office': perm='yes — Office'
 elif p=='/standings': perm='yes — League'
 disc='high' if p in ['/','/roster','/game-plan','/week-advance'] else ('medium' if p in ['/standings','/contracts','/trades','/scouting','/draft','/free-agency','/game-day','/franchise','/dynasty','/settings'] else 'low-to-medium')
 mobile='direct but dense' if p in ['/','/roster','/game-plan','/week-advance'] else 'usually reached through the overloaded More drawer; screen behavior varies'
 scroll='very high measured' if p in ['/','/roster','/standings'] else ('high measured' if p in ['/game-plan','/analytics','/franchise','/dynasty'] else 'representative-source risk; measure during packet migration')
 out.append({
 'current_path':p,'current_label':r['label'],'current_short_label':r['short'],'current_room':r['room'],'current_nerd_group':r['nerd'],'unlock_week':r['unlock_week'],'unlock_phase':r['unlock_phase'],'user_job':job,'lifecycle_phase':phase,'frequency':freq,'urgency':urg,'current_surface_type':current_type,
 'current_entry_points':'five-room navigation, alternate Nerd grouping, command palette, contextual links, and mobile More; selected core routes also use persistent bottom navigation',
 'current_back_return_behavior':'hash routing works, but return-to-origin task, local context, and scroll restoration are not consistently modeled',
 'current_discoverability':disc,'current_mobile_usability':mobile,'current_scroll_burden':scroll,'overlap_or_ambiguity':overlap,'belongs_in_permanent_nav':perm,'recommended_parent_hub':hub,'recommended_canonical_path':future,'recommended_surface_type':surface,'recommended_placement':placement,
 'route_compatibility':'keep current hash path as alias or compatibility wrapper for at least one full release; retire only after route-coverage proof and H2 approval',
 'feature_loss_risk':'high until every action, state, unlock rule, and deep link is covered by a route contract test',
 'required_acceptance_test':f"From {hub}, reach the complete {r['label']} capability in no more than 3 intentional interactions (1 from an active related task); opening {p} resolves to the new surface with state, unlock rules, and back behavior intact."
 })
path=root/'docs/ui-overhaul/ROUTE_SURFACE_MATRIX.csv'
with path.open('w',newline='',encoding='utf-8') as f:
 w=csv.DictWriter(f,fieldnames=fields);w.writeheader();w.writerows(out)
(root/'docs/ui-overhaul/evidence/data/route-surface-matrix.json').write_text(json.dumps(out,indent=2))
print(path,len(out))
