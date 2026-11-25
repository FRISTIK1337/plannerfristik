(() => {
  const STORE_KEY = 'ritmPlanner_v1';
  const DEFAULT_CATS = [
    {id:'work',xp:10,name:'Работа',color:'#8f7cf6'},
    {id:'study',xp:8,name:'Учёба',color:'#55b8da'},
    {id:'sport',xp:5,name:'Тренировка',color:'#e28bba'},
    {id:'home',xp:4,name:'Уборка',color:'#e5ad62'},
    {id:'project',xp:10,name:'Личный проект',color:'#9e8cff'},
    {id:'skills',xp:8,name:'Развитие навыков',color:'#58c3bf'},
    {id:'reading',xp:4,name:'Чтение книг',color:'#c19ae8'},
    {id:'admin',xp:3,name:'Важные личные дела',color:'#d6a36c'},
    {id:'sleep',xp:0,name:'Сон',color:'#778bd9'},
    {id:'rest',xp:0,name:'Отдых',color:'#65c6a6'},
    {id:'food',xp:0,name:'Еда',color:'#d5c36d'},
    {id:'hygiene',xp:0,name:'Гигиена и уход',color:'#83a9cc'},
    {id:'travel',xp:0,name:'Дорога',color:'#8493a7'},
    {id:'other',xp:0,name:'Другое',color:'#9ba4b8'}
  ];
  const NO_XP_CATS = new Set(['sleep','rest','food','hygiene','travel','other']);
  const $ = id => document.getElementById(id);
  const pad = n => String(n).padStart(2,'0');
  const toISO = d => `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
  const parseISO = s => {const [y,m,d]=s.split('-').map(Number);return new Date(y,m-1,d,12)};
  // Work with local calendar dates (not UTC) to avoid timezone shifts.
  const dayStart = iso => {const d=parseISO(iso);d.setHours(0,0,0,0);return d};
  const dateTime = (iso,t) => {const d=parseISO(iso);const [h,m]=t.split(':').map(Number);d.setHours(h,m,0,0);return d};
  const eventInterval = e => ({start:dateTime(e.date,e.start),end:dateTime(e.endDate||e.date,e.end)});
  const fmtDateShort = iso => fmtShort(parseISO(iso));
  const addDays = (d,n) => {const x=new Date(d);x.setDate(x.getDate()+n);return x};
  const mondayOf = d => {const x=new Date(d);x.setHours(12,0,0,0);x.setDate(x.getDate()-((x.getDay()+6)%7));return x};
  const fmtShort = d => d.toLocaleDateString('ru-RU',{day:'numeric',month:'short'}).replace('.','');
  const fmtFull = d => d.toLocaleDateString('ru-RU',{day:'numeric',month:'long'});
  const mins = t => {const [h,m]=t.split(':').map(Number);return h*60+m};
  const time = m => `${pad(Math.floor(m/60))}:${pad(m%60)}`;
  const escapeHTML = s => String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const uid = () => 'id_'+Date.now().toString(36)+'_'+Math.random().toString(36).slice(2,8);
  const load = () => {try{const x=JSON.parse(localStorage.getItem(STORE_KEY));if(x&&Array.isArray(x.events)&&Array.isArray(x.categories))return x}catch(e){}return {events:[],categories:DEFAULT_CATS.map(x=>({...x})),settings:{dailyGoal:2,weeklyGoal:10}}};
  let state=load();
  // Migrate old planner data without losing the user's schedule or categories.
  const existingCategories=Array.isArray(state.categories)?state.categories:[];
  state.categories=DEFAULT_CATS.map(base=>({...base,...(existingCategories.find(c=>c.id===base.id)||{}),xp:NO_XP_CATS.has(base.id)?0:Number(existingCategories.find(c=>c.id===base.id)?.xp ?? base.xp)}));
  existingCategories.filter(c=>!DEFAULT_CATS.some(d=>d.id===c.id)).forEach(c=>state.categories.push({...c,xp:Number(c.xp??0)===3?0:Number(c.xp??0)}));
  state.settings={dailyGoal:2,weeklyGoal:10,...(state.settings||{})};
  state.notifications={enabled:false,leadMinutes:5,lastNotified:[],...(state.notifications||{})};
  state.notifications.leadMinutes=[0,5,10,15,30].includes(Number(state.notifications.leadMinutes))?Number(state.notifications.leadMinutes):5;
  state.notifications.lastNotified=Array.isArray(state.notifications.lastNotified)?state.notifications.lastNotified:[];
  state.game={bestScore:0,rewardDate:'',totalPlays:0,lastScore:0,...(state.game||{})};
  state.collection={unlocked:[],active:'goku',initialized:false,formsUnlocked:[],activeForms:{},... (state.collection||{})};
  if(!Array.isArray(state.collection.unlocked))state.collection.unlocked=[];
  if(!Array.isArray(state.collection.formsUnlocked))state.collection.formsUnlocked=[];
  state.collection.activeForms=state.collection.activeForms&&typeof state.collection.activeForms==='object'?state.collection.activeForms:{};
  state.economy={coins:0,shards:0,ownedCards:{},ownedItems:[],equippedItems:{},totalCasesOpened:0,epicPity:0,ledger:[],...(state.economy||{})};
  state.economy.coins=Math.max(0,Number(state.economy.coins)||0);state.economy.shards=Math.max(0,Number(state.economy.shards)||0);state.economy.ownedCards=state.economy.ownedCards&&typeof state.economy.ownedCards==='object'?state.economy.ownedCards:{};state.economy.ownedItems=Array.isArray(state.economy.ownedItems)?state.economy.ownedItems:[];state.economy.equippedItems=state.economy.equippedItems&&typeof state.economy.equippedItems==='object'?state.economy.equippedItems:{};state.economy.ledger=Array.isArray(state.economy.ledger)?state.economy.ledger:[];
  state.events=(Array.isArray(state.events)?state.events:[]).map(e=>{const done=!!e.done;const failed=!!e.failed&&!done;return {...e,done,failed,earnedXP:(!done||NO_XP_CATS.has(e.categoryId)||Number(state.categories.find(c=>c.id===e.categoryId)?.xp??0)<=0)?0:(Number(e.earnedXP)||0),penaltyXP:failed&&!NO_XP_CATS.has(e.categoryId)?Math.max(0,Number(e.penaltyXP)||0):0,penaltyApplied:failed?Math.max(0,Number(e.penaltyApplied)||0):0,completedAt:done?(e.completedAt||null):null,failedAt:failed?(e.failedAt||null):null};});
  let taskFilter='all';
  let weekStart=mondayOf(new Date());
  let activeMobileDate=toISO(new Date());
  let calendarView='week';
  let editingId=null;
  const save=()=>{
    try{
      localStorage.setItem(STORE_KEY,JSON.stringify(state));
      const status=$('saveStateText');if(status)status.textContent='Сохранено на этом устройстве';
      return true;
    }catch(err){
      console.error('Ritm planner: local save failed',err);
      const status=$('saveStateText');if(status)status.textContent='Не удалось сохранить в браузере — скачай резервную копию';
      return false;
    }
  };
  const toast=msg=>{const el=$('toast');el.textContent=msg;el.classList.add('show');clearTimeout(toast.t);toast.t=setTimeout(()=>el.classList.remove('show'),2300)};
  const LEVEL_TITLES=[{level:1,title:'Новичок'},{level:2,title:'Ученик'},{level:3,title:'Практик'},{level:5,title:'Воин Z'},{level:7,title:'Сайян'},{level:10,title:'Суперсайян'},{level:15,title:'Защитник мечты'},{level:20,title:'Капитан'},{level:25,title:'Король пиратов'},{level:30,title:'Легенда'},{level:40,title:'Мастер Ки'},{level:50,title:'Легенда Нового мира'},{level:75,title:'За гранью'},{level:100,title:'Абсолют'}];
  function titleForLevel(level){let current=LEVEL_TITLES[0],next=null;for(const t of LEVEL_TITLES){if(t.level<=level)current=t;else{next=t;break;}}return {current:current.title,next};}
  const CHARACTERS = [{"id":"goku","name":"Сон Гоку","series":"DRAGON BALL","seriesName":"Dragon Ball","role":"Сайян, который всегда ищет способ стать сильнее.","rarity":"Стартовый","rarityKey":"common","level":1,"quote":"Даже сильнейший когда-то начинал с первого шага.","requirements":[],"img":"./assets/images/embedded/embedded-02.jpg","palette":"#f29a45"},{"id":"vegeta","name":"Вегета","series":"DRAGON BALL","seriesName":"Dragon Ball","role":"Принц Сайянов. Характер, амбиции и железная воля.","rarity":"Редкий","rarityKey":"rare","level":5,"quote":"Работай над собой, даже когда никто не смотрит.","requirements":[{"metric":"level","target":5,"label":"Достигни 5 уровня"}],"img":"./assets/images/embedded/embedded-03.jpg","palette":"#4a8de7"},{"id":"gohan","name":"Гохан","series":"DRAGON BALL","seriesName":"Dragon Ball","role":"Сила, которая раскрывается через знания и дисциплину.","rarity":"Эпический","rarityKey":"epic","level":8,"quote":"Учёба тоже может стать твоей суперсилой.","requirements":[{"metric":"level","target":8,"label":"Достигни 8 уровня"},{"metric":"study","target":10,"label":"Открой достижение «Любознательный» · 10 учебных сессий"}],"img":"./assets/images/embedded/embedded-04.jpg","palette":"#a77ce8"},{"id":"luffy","name":"Монки Д. Луффи","series":"ONE PIECE","seriesName":"One Piece","role":"Капитан, который не отступает от своей мечты.","rarity":"Эпический","rarityKey":"epic","level":10,"quote":"Большой путь начинается с решения не сдаваться.","requirements":[{"metric":"level","target":10,"label":"Достигни 10 уровня"},{"metric":"productive","target":50,"label":"Открой достижение «Курс на Гранд-Лайн» · 50 важных задач"}],"img":"./assets/images/embedded/embedded-05.jpg","palette":"#dd685a"},{"id":"zoro","name":"Ророноа Зоро","series":"ONE PIECE","seriesName":"One Piece","role":"Мечник, который превращает повторения в мастерство.","rarity":"Легендарный","rarityKey":"legendary","level":12,"quote":"Повторяй базу, пока она не станет твоей силой.","requirements":[{"metric":"level","target":12,"label":"Достигни 12 уровня"},{"metric":"sport","target":5,"label":"Открой достижение «Первые мышцы» · 5 тренировок"}],"img":"./assets/images/embedded/embedded-06.jpg","palette":"#63bf8b"},{"id":"sanji","name":"Санджи","series":"ONE PIECE","seriesName":"One Piece","role":"Повар команды. Забота, навык и надёжная работа.","rarity":"Редкий","rarityKey":"rare","level":15,"quote":"Профессионализм складывается из сотен точных действий.","requirements":[{"metric":"level","target":15,"label":"Достигни 15 уровня"},{"metric":"work","target":25,"label":"Открой достижение «Надёжный профи» · 25 рабочих задач"}],"img":"./assets/images/embedded/embedded-07.jpg","palette":"#edc65f"},{"id":"naruto","name":"Наруто Узумаки","series":"NARUTO","seriesName":"Naruto","role":"Ниндзя, который доказывает всё постоянством.","rarity":"Эпический","rarityKey":"epic","level":18,"quote":"Не бросай себя после одного трудного дня.","requirements":[{"metric":"level","target":18,"label":"Достигни 18 уровня"},{"metric":"streak","target":7,"label":"Собери серию из 7 дней"}],"img":"./assets/images/embedded/embedded-08.jpg","palette":"#e9a348"},{"id":"kakashi","name":"Какаши Хатаке","series":"NARUTO","seriesName":"Naruto","role":"Спокойствие, подготовка и умение учиться у других.","rarity":"Легендарный","rarityKey":"legendary","level":20,"quote":"Подготовка — это то, что помогает действовать без суеты.","requirements":[{"metric":"level","target":20,"label":"Достигни 20 уровня"},{"metric":"study","target":50,"label":"Открой достижение «Мышление мастера» · 50 учебных сессий"}],"img":"./assets/images/embedded/embedded-09.jpg","palette":"#a1b7cb"},{"id":"tanjiro","name":"Тандзиро Камадо","series":"DEMON SLAYER","seriesName":"Demon Slayer","role":"Настойчивый герой, который растёт через ежедневную практику.","rarity":"Легендарный","rarityKey":"legendary","level":25,"quote":"Терпение и практика делают невозможное ближе.","requirements":[{"metric":"level","target":25,"label":"Достигни 25 уровня"},{"metric":"sport","target":50,"label":"Открой достижение «Мастер формы» · 50 тренировок"},{"metric":"productive","target":100,"label":"Открой достижение «Двигатель прогресса» · 100 важных задач"}],"img":"./assets/images/embedded/embedded-10.jpg","palette":"#5ab99b"}];

  CHARACTERS.push(
    {id:'jotaro',name:'Джотаро Куджо',series:"JOJO'S BIZARRE ADVENTURE",seriesName:"JoJo's Bizarre Adventure",role:'Спокойствие, точность и несгибаемая воля. Его стенд — Star Platinum.',rarity:'Эпический',rarityKey:'epic',level:22,quote:'Хорошо. Продолжай идти вперёд.',requirements:[{metric:'level',target:22,label:'Достигни 22 уровня'},{metric:'study',target:10,label:'Заверши 10 учебных сессий'}],img:"./assets/images/characters/jotaro.jpg"},
    {id:'dio',name:'Дио Брандо',series:"JOJO'S BIZARRE ADVENTURE",seriesName:"JoJo's Bizarre Adventure",role:'Амбиции, харизма и контроль времени. Его стенд — The World.',rarity:'Легендарный',rarityKey:'legendary',level:28,quote:'Время принадлежит тому, кто умеет им распорядиться.',requirements:[{metric:'level',target:28,label:'Достигни 28 уровня'},{metric:'work',target:15,label:'Заверши 15 рабочих задач'}],img:"./assets/images/characters/dio.jpg"}
  );


  
  const FORM_SKINS = [{"id":"goku_ssj","characterId":"goku","name":"Супер Сайян","series":"Dragon Ball","rarity":"Редкая","rarityKey":"rare","level":10,"xp":900,"imgKey":"goku_ssj","description":"Золотая аура и первая большая трансформация."},{"id":"goku_blue","characterId":"goku","name":"Super Saiyan Blue","series":"Dragon Ball","rarity":"Эпическая","rarityKey":"epic","level":20,"xp":1900,"imgKey":"goku_blue","description":"Сила под полным контролем."},{"id":"goku_ui","characterId":"goku","name":"Ultra Instinct","series":"Dragon Ball","rarity":"Легендарная","rarityKey":"legendary","level":35,"xp":3400,"imgKey":"goku_ui","description":"Спокойствие, скорость и реакция без лишних мыслей."},{"id":"vegeta_blue","characterId":"vegeta","name":"Super Saiyan Blue","series":"Dragon Ball","rarity":"Эпическая","rarityKey":"epic","level":20,"xp":1900,"imgKey":"vegeta_blue","description":"Королевская гордость и совершенный контроль ки."},{"id":"vegeta_ego","characterId":"vegeta","name":"Ultra Ego","series":"Dragon Ball","rarity":"Легендарная","rarityKey":"legendary","level":40,"xp":3900,"imgKey":"vegeta_ego","description":"Форма, в которой воля становится оружием."},{"id":"luffy_gear2","characterId":"luffy","name":"Gear Second","series":"One Piece","rarity":"Редкая","rarityKey":"rare","level":12,"xp":1100,"imgKey":"luffy_gear2","description":"Ускорение тела и красный пар."},{"id":"luffy_gear4","characterId":"luffy","name":"Gear Fourth","series":"One Piece","rarity":"Эпическая","rarityKey":"epic","level":25,"xp":2400,"imgKey":"luffy_gear4","description":"Усиление, которое превращает давление в силу."},{"id":"luffy_gear5","characterId":"luffy","name":"Gear Fifth","series":"One Piece","rarity":"Легендарная","rarityKey":"legendary","level":40,"xp":3900,"imgKey":"luffy_gear5","description":"Свобода воображения и пробуждение силы."},{"id":"zoro_ashura","characterId":"zoro","name":"Асура","series":"One Piece","rarity":"Эпическая","rarityKey":"epic","level":25,"xp":2400,"imgKey":"zoro_ashura","description":"Три меча, стальная дисциплина и воля."},{"id":"zoro_king","characterId":"zoro","name":"Король Ада","series":"One Piece","rarity":"Легендарная","rarityKey":"legendary","level":42,"xp":4100,"imgKey":"zoro_king","description":"Высшая концентрация и сила клинка."},{"id":"naruto_kurama","characterId":"naruto","name":"Режим чакры Курамы","series":"Naruto","rarity":"Эпическая","rarityKey":"epic","level":25,"xp":2400,"imgKey":"naruto_kurama","description":"Сила девятихвостого и защита друзей."},{"id":"naruto_six","characterId":"naruto","name":"Режим Мудреца Шести Путей","series":"Naruto","rarity":"Легендарная","rarityKey":"legendary","level":42,"xp":4100,"imgKey":"naruto_six","description":"Редкое состояние, открытое через внутренний баланс."},{"id":"gohan_beast","characterId":"gohan","name":"Beast","series":"Dragon Ball","rarity":"Легендарная","rarityKey":"legendary","level":50,"xp":4900,"imgKey":"gohan_beast","description":"Скрытый потенциал, доведённый до предела."},{"id":"jotaro_stand","characterId":"jotaro","name":"Star Platinum","series":"JoJo","rarity":"Эпическая","rarityKey":"epic","level":24,"xp":2300,"imgKey":"jojo_star_platinum","description":"Стенд с невероятной точностью и скоростью."},{"id":"jotaro_world","characterId":"jotaro","name":"Star Platinum: The World","series":"JoJo","rarity":"Легендарная","rarityKey":"legendary","level":40,"xp":3900,"imgKey":"jojo_star_platinum_world","description":"Предел возможностей стенда Джотаро."},{"id":"dio_world","characterId":"dio","name":"The World","series":"JoJo","rarity":"Легендарная","rarityKey":"legendary","level":30,"xp":2900,"imgKey":"jojo_the_world","description":"Стенд, способный останавливать время."},{"id":"dio_over","characterId":"dio","name":"The World: Over Heaven","series":"JoJo","rarity":"Мифическая","rarityKey":"mythic","level":60,"xp":5900,"imgKey":"jojo_the_world_over","description":"Предельная форма силы Дио."}];
  const FORM_IMAGES = {
    "goku_ssj":"./assets/images/forms/goku-ssj.jpg",
    "goku_blue":"./assets/images/forms/goku-blue.jpg",
    "goku_ui":"./assets/images/forms/goku-ultra-instinct.jpg",
    "vegeta_blue":"./assets/images/forms/vegeta-blue.jpg",
    "vegeta_ego":"./assets/images/forms/vegeta-ego.jpg",
    "luffy_gear2":"./assets/images/forms/luffy-gear2.jpg",
    "luffy_gear4":"./assets/images/forms/luffy-gear4.jpg",
    "luffy_gear5":"./assets/images/forms/luffy-gear5.jpg",
    "zoro_ashura":"./assets/images/forms/zoro-ashura.jpg",
    "zoro_king":"./assets/images/forms/zoro-king-of-hell.jpg",
    "naruto_kurama":"./assets/images/forms/naruto-kurama.jpg",
    "naruto_six":"./assets/images/forms/naruto-six-paths.jpg",
    "gohan_beast":"./assets/images/forms/gohan-beast.jpg",
    "jojo_star_platinum":"./assets/images/stands/star-platinum.jpg",
    "jojo_star_platinum_world":"./assets/images/stands/star-platinum-world.jpg",
    "jojo_the_world":"./assets/images/stands/the-world.jpg",
    "jojo_the_world_over":"./assets/images/stands/the-world-over-heaven.jpg"
  };
  const CASE_TYPES=[
    {id:'basic',name:'Базовый кейс',price:80,icon:'📦',image:'./assets/images/cases/basic.jpg',tone:'#8d83bd',desc:'Небольшой шанс найти редкую карточку.',odds:{common:65,rare:25,epic:9,legendary:1}},
    {id:'rare',name:'Редкий кейс',price:220,icon:'🧰',image:'./assets/images/cases/rare.jpg',tone:'#58b8d7',desc:'Больше редких и эпических наград.',odds:{common:45,rare:38,epic:14,legendary:3}},
    {id:'epic',name:'Эпический кейс',price:450,icon:'💜',image:'./assets/images/cases/epic.jpg',tone:'#a77cff',desc:'Серьёзный шанс на эпическую карточку.',odds:{common:20,rare:40,epic:32,legendary:8}},
    {id:'legendary',name:'Легендарный кейс',price:900,icon:'👑',image:'./assets/images/cases/legendary.jpg',tone:'#f0c76c',desc:'Высокие шансы на легендарный дроп.',odds:{common:5,rare:25,epic:50,legendary:20}}
  ];
  const MARKET_ITEMS=[
    {id:'frame_ki',name:'Рамка Ки',icon:'🟣',price:260,desc:'Сияющая рамка профиля в стиле Dragon Ball.'},
    {id:'banner_grand',name:'Фон Гранд-Лайн',icon:'🏴‍☠️',price:480,desc:'Морской фон для твоего профиля.'},
    {id:'aura_saiyan',name:'Аура Сайяна',icon:'🔥',price:650,desc:'Золотистое свечение вокруг аватара.'},
    {id:'sticker_jojo',name:'Стикер стенда',icon:'⚡',price:390,desc:'Коллекционный декоративный значок JoJo.'},
    {id:'banner_konoha',name:'Вечерняя Коноха',icon:'🍃',price:520,desc:'Тихий фон скрытой деревни.'},
    {id:'frame_onepiece',name:'Рамка капитана',icon:'☠️',price:750,desc:'Редкая рамка для настоящего капитана.'}
  ];
  const CARD_DEFS=[
    ['card_goku','Гоку · Начало пути','common','goku'],['card_vegeta','Вегета · Гордость принца','rare','vegeta'],['card_gohan','Гохан · Скрытая сила','epic','gohan'],
    ['card_luffy','Луффи · Мечта о свободе','common','luffy'],['card_zoro','Зоро · Три меча','rare','zoro'],['card_sanji','Санджи · Чёрная нога','rare','sanji'],
    ['card_naruto','Наруто · Путь ниндзя','epic','naruto'],['card_kakashi','Какаши · Копирующий ниндзя','rare','kakashi'],['card_tanjiro','Тандзиро · Дыхание воды','epic','tanjiro'],
    ['card_jotaro','Джотаро · Star Platinum','epic','jotaro'],['card_dio','Дио · The World','legendary','dio'],
    ['card_goku_ssj','Гоку · Super Saiyan','rare','form:goku_ssj'],['card_goku_blue','Гоку · Blue','epic','form:goku_blue'],['card_goku_ui','Гоку · Ultra Instinct','legendary','form:goku_ui'],
    ['card_luffy_gear5','Луффи · Gear Fifth','legendary','form:luffy_gear5'],['card_naruto_kurama','Наруто · Курама','epic','form:naruto_kurama'],['card_jotaro_stand','Джотаро · Star Platinum: The World','legendary','form:jotaro_world']
  ];
  function cardCatalog(){return CARD_DEFS.map(([id,name,rarity,source])=>{let img='';if(source.startsWith('form:'))img=FORM_IMAGES[FORM_SKINS.find(f=>f.id===source.slice(5))?.imgKey]||'';else img=CHARACTERS.find(c=>c.id===source)?.img||'';return {id,name,rarity,source,img};});}
  const FORM_EXTRA_REQS={
    goku_ssj:[{metric:'sport',target:3,label:'3 тренировки'}],goku_blue:[{metric:'sport',target:15,label:'15 тренировок'}],goku_ui:[{metric:'sport',target:30,label:'30 тренировок'},{metric:'streak',target:7,label:'Серия 7 дней'}],
    vegeta_blue:[{metric:'work',target:10,label:'10 рабочих задач'}],vegeta_ego:[{metric:'sport',target:35,label:'35 тренировок'}],
    luffy_gear2:[{metric:'work',target:10,label:'10 рабочих задач'}],luffy_gear4:[{metric:'work',target:25,label:'25 рабочих задач'}],luffy_gear5:[{metric:'productive',target:75,label:'75 важных задач'}],
    zoro_ashura:[{metric:'sport',target:20,label:'20 тренировок'}],zoro_king:[{metric:'sport',target:45,label:'45 тренировок'}],
    naruto_kurama:[{metric:'study',target:10,label:'10 учебных сессий'}],naruto_six:[{metric:'study',target:30,label:'30 учебных сессий'},{metric:'streak',target:7,label:'Серия 7 дней'}],
    gohan_beast:[{metric:'study',target:25,label:'25 учебных сессий'}],jotaro_stand:[{metric:'study',target:20,label:'20 учебных сессий'}],jotaro_world:[{metric:'study',target:35,label:'35 учебных сессий'},{metric:'streak',target:14,label:'Серия 14 дней'}],
    dio_world:[{metric:'work',target:20,label:'20 рабочих задач'}],dio_over:[{metric:'work',target:40,label:'40 рабочих задач'},{metric:'study',target:40,label:'40 учебных сессий'}]
  };
  FORM_SKINS.forEach(f=>f.extraRequirements=FORM_EXTRA_REQS[f.id]||[]);

  const QUOTES=[
    ['Сила появляется не в один момент — она собирается из повторений.','Сайянский настрой'],
    ['Не жди идеального дня. Сделай сегодняшний день чуть лучше вчерашнего.','Мысль дня'],
    ['Большая мечта становится ближе, когда у неё появляется расписание.','Курс на Гранд-Лайн'],
    ['Даже маленькая тренировка — это голос за свою будущую версию.','Тренировка бойца'],
    ['Победа начинается там, где заканчиваются отговорки.','Настрой воина'],
    ['Не обязательно быть самым быстрым. Важно не бросать свой путь.','Путь капитана'],
    ['Один закрытый пункт лучше десяти идеальных планов.','Дисциплина'],
    ['Отдых — часть восстановления. Возвращайся сильнее, а не измотаннее.','Баланс силы'],
    ['Твой главный соперник — не другой человек, а вчерашняя привычка откладывать.','Тренировка характера'],
    ['Собирай маленькие победы, как семь сфер: однажды они сложатся в большое желание.','Dragon Ball mood'],
    ['У каждого большого путешествия есть первый шаг за порог.','Grand Line mood'],
    ['Неудачный день — это глава, а не вся история. Переверни страницу.','Новый эпизод'],
    ['Умение учиться — усиление, которое остаётся с тобой навсегда.','Путь мастера'],
    ['Сделай сегодня то, за что завтрашний ты скажет спасибо.','Мысль дня'],
    ['Настоящая прокачка — это когда ты возвращаешься к делу даже после паузы.','Сайянский настрой'],
    ['Не нужно побеждать весь мир. Победи хаос в ближайшем часу.','Фокус героя'],
    ['Большие уровни состоят из маленьких выполненных задач.','Level up'],
    ['Смелость — начать. Сила — продолжать. Мудрость — вовремя восстановиться.','Баланс героя'],
    ['Держи курс на свою мечту, даже если Гранд-Лайн сегодня штормит.','One Piece mood'],
    ['Твоя энергия не бесконечна. Направляй её на то, что имеет значение.','Мастер Ки'],
    ['Каждый навык когда-то был сложным. Дай себе время стать сильнее.','Путь ученика'],
    ['Если сорвался с ритма — не вини себя. Просто вернись к следующему шагу.','Новый старт'],
    ['Не сравнивай свою первую серию с чужим финальным сезоном.','Главный герой'],
    ['Настойчивость не шумит. Она просто появляется снова и снова.','Дисциплина'],
    ['Сегодняшние усилия — это тренировка для будущих возможностей.','Будущий ты']
  ];
  let quoteIndex=(new Date().getDate()-1)%QUOTES.length;
  function renderQuote(){const q=QUOTES[quoteIndex%QUOTES.length];$('dailyQuote').textContent='«'+q[0]+'»';$('quoteSource').textContent=q[1]+' · fristik.planner';}

  const category=id=>state.categories.find(c=>c.id===id)||state.categories.find(c=>c.id==='other')||{name:'Другое',color:'#9ba4b8'};
  const taskPenalty=c=>{const xp=Math.max(0,Number(c?.xp)||0);return xp>0?Math.min(5,Math.max(1,Math.round(xp*.3))):0;};
  const xpEarnedAll=()=>state.events.filter(e=>e.done).reduce((n,e)=>n+Math.max(0,Number(e.earnedXP)||0),0);
  const xpPenaltyAll=()=>state.events.filter(e=>e.failed).reduce((n,e)=>n+Math.max(0,Number(e.penaltyApplied)||0),0);
  const netXPAll=()=>Math.max(0,xpEarnedAll()-xpPenaltyAll());
  const xpLevel=()=>Math.floor(netXPAll()/100)+1;
  const getWeekDates=()=>Array.from({length:7},(_,i)=>addDays(weekStart,i));
  const allEventsForWeek=()=>{const start=dayStart(toISO(weekStart)),end=dayStart(toISO(addDays(weekStart,7)));return state.events.filter(e=>{const x=eventInterval(e);return x.start<end&&x.end>start})};
  function currentViewRange(){
    if(calendarView==='day'){const start=dayStart(activeMobileDate);return {start,end:dayStart(toISO(addDays(start,1)))}}
    if(calendarView==='month'){const a=parseISO(activeMobileDate),start=new Date(a.getFullYear(),a.getMonth(),1,0,0,0,0),end=new Date(a.getFullYear(),a.getMonth()+1,1,0,0,0,0);return {start,end}}
    const start=dayStart(toISO(weekStart));return {start,end:dayStart(toISO(addDays(weekStart,7))) };
  }
  function eventsForCurrentView(){const {start,end}=currentViewRange();return state.events.filter(e=>{const x=eventInterval(e);return x.start<end&&x.end>start});}
  function currentViewLabel(){return calendarView==='day'?'день':calendarView==='month'?'месяц':'неделю';}
  function renderCategories(){
    $('categoryChips').innerHTML=state.categories.map(c=>`<span class="cat-chip"><i class="dot" style="background:${c.color}"></i>${escapeHTML(c.name)} <span style="color:${Number(c.xp)>0?'#b9adff':'#9098b3'};font-size:10px">${Number(c.xp)>0?'+'+Number(c.xp)+' XP':'БЕЗ XP'}</span></span>`).join('');
    $('eventCategory').innerHTML=state.categories.map(c=>`<option value="${escapeHTML(c.id)}">${escapeHTML(c.name)} · ${Number(c.xp)>0?'+'+Number(c.xp)+' XP':'без XP'}</option>`).join('');
    $('categoryList').innerHTML=state.categories.map(c=>`<div class="category-row" data-id="${escapeHTML(c.id)}"><i class="dot" style="width:10px;height:10px;background:${c.color}"></i><span>${escapeHTML(c.name)}</span><label class="xp-editor"><input type="number" min="0" max="100" value="${Math.max(0,Math.min(100,Number(c.xp)||0))}" data-xp="${escapeHTML(c.id)}" aria-label="Опыт за ${escapeHTML(c.name)}" ${NO_XP_CATS.has(c.id)?'disabled title="Базовые потребности не дают XP"':''} /> XP</label><input type="color" value="${c.color}" aria-label="Цвет категории ${escapeHTML(c.name)}" data-color="${escapeHTML(c.id)}" /><button type="button" data-rename="${escapeHTML(c.id)}" title="Переименовать">✎</button>${DEFAULT_CATS.some(d=>d.id===c.id)?'':`<button type="button" data-remove="${escapeHTML(c.id)}" title="Удалить категорию">×</button>`}</div>`).join('');
  }
  function renderMobileDays(dates){
    $('mobileDays').innerHTML=dates.map(d=>{const iso=toISO(d);const isActive=iso===activeMobileDate;return `<button class="day-pick ${isActive?'active':''}" data-day="${iso}"><b>${d.toLocaleDateString('ru-RU',{weekday:'short'}).replace('.','')}</b><span>${pad(d.getDate())}</span></button>`}).join('');
    if(!dates.some(d=>toISO(d)===activeMobileDate))activeMobileDate=toISO(dates[0]);
  }
  function segmentsForDay(event,iso){
    const range=eventInterval(event);if(!(range.end>range.start))return null;
    const start=dayStart(iso),end=dayStart(toISO(addDays(parseISO(iso),1)));
    const clippedStart=Math.max(range.start.getTime(),start.getTime());
    const clippedEnd=Math.min(range.end.getTime(),end.getTime());
    if(clippedEnd<=clippedStart)return null;
    return {event,startMin:(clippedStart-start.getTime())/60000,endMin:(clippedEnd-start.getTime())/60000,continuesBefore:range.start<start,continuesAfter:range.end>end};
  }
  function allocateLanes(segments){
    const sorted=[...segments].sort((a,b)=>a.startMin-b.startMin||a.endMin-b.endMin);
    const lanes=[];
    sorted.forEach(e=>{let lane=lanes.findIndex(lastEnd=>lastEnd<=e.startMin);if(lane<0){lane=lanes.length;lanes.push(e.endMin)}else lanes[lane]=e.endMin;e._lane=lane;});
    sorted.forEach(e=>{const overlaps=sorted.filter(x=>x.startMin<e.endMin&&x.endMin>e.startMin);e._laneCount=Math.max(1,...overlaps.map(x=>x._lane+1));});
    return sorted;
  }
  function getStreak(){
    const completedDates=new Set(state.events.filter(e=>e.done&&e.completedAt&&(Number(e.earnedXP)||0)>0).map(e=>e.completedAt));
    const today=toISO(new Date());let cursor=completedDates.has(today)?parseISO(today):addDays(parseISO(today),-1);
    if(!completedDates.has(toISO(cursor)))return 0;
    let count=0;while(completedDates.has(toISO(cursor))){count++;cursor=addDays(cursor,-1);}return count;
  }
  function getLongestStreak(){
    const dates=[...new Set(state.events.filter(e=>e.done&&e.completedAt&&(Number(e.earnedXP)||0)>0).map(e=>e.completedAt))].sort();
    let best=0,current=0,previous=null;
    dates.forEach(iso=>{const d=parseISO(iso);if(previous&&Math.round((d-previous)/86400000)===1)current++;else current=1;best=Math.max(best,current);previous=d;});
    return best;
  }
  function renderProgress(){
    const allDone=state.events.filter(e=>e.done),allFailed=state.events.filter(e=>e.failed);
    const productiveDone=allDone.filter(e=>(Number(e.earnedXP)||0)>0);
    const totalXP=netXPAll(),earned= xpEarnedAll(),penalty=xpPenaltyAll();
    const level=Math.floor(totalXP/100)+1,intoLevel=totalXP%100,remaining=100-intoLevel;
    const periodEvents=eventsForCurrentView(),periodDone=periodEvents.filter(e=>e.done),periodFailed=periodEvents.filter(e=>e.failed);
    const percent=periodEvents.length?Math.round(periodDone.length/periodEvents.length*100):0;
    const {start:periodStart,end:periodEnd}=currentViewRange(),periodStartISO=toISO(periodStart),periodEndISO=toISO(periodEnd);
    const periodEarned=state.events.filter(e=>e.done&&e.completedAt&&e.completedAt>=periodStartISO&&e.completedAt<periodEndISO).reduce((sum,e)=>sum+(Number(e.earnedXP)||0),0);
    const periodPenalty=state.events.filter(e=>e.failed&&e.failedAt&&e.failedAt>=periodStartISO&&e.failedAt<periodEndISO).reduce((sum,e)=>sum+(Number(e.penaltyApplied)||0),0);
    const periodXP=Math.max(0,periodEarned-periodPenalty);
    const periodName=calendarView==='day'?'ДНЯ':calendarView==='month'?'МЕСЯЦА':'НЕДЕЛИ';
    $('periodDoneLabel').textContent=`ВЫПОЛНЕНО ЗА ${periodName}`;$('periodRateLabel').textContent=`ПРОГРЕСС ${periodName}`;$('categoryPeriodLabel').textContent=`БАЛАНС · ${periodName}`;
    const rank=titleForLevel(level);
    $('levelNumber').textContent=level;$('levelCaption').textContent=rank.current+' · каждый важный шаг усиливает тебя';
    $('levelProgressFill').style.width=`${intoLevel}%`;$('levelXpText').textContent=`${intoLevel} / 100 XP`;$('totalXpText').textContent=`Всего ${totalXP} XP`;
    $('currentTitle').textContent=`ТИТУЛ · ${rank.current}`;$('nextTitle').textContent=rank.next?`Следующий: ${rank.next.title} · ур. ${rank.next.level}`:'Максимальный титул открыт';
    const milestones=[{n:1,label:'🌱 Первое дело — путь начался'},{n:10,label:'⚡ 10 побед — ты в ритме'},{n:25,label:'🚀 25 побед — отличный темп'},{n:50,label:'💎 50 побед — дисциплина растёт'},{n:100,label:'👑 100 побед — легендарный путь'}];
    const achieved=milestones.filter(m=>productiveDone.length>=m.n).sort((a,b)=>b.n-a.n)[0];
    $('achievementLabel').textContent=achieved?achieved.label:'🌱 Начало пути — первая победа впереди';
    $('weekDoneCount').textContent=`${periodDone.length} / ${periodEvents.length}`;
    $('weekDoneHint').textContent=periodEvents.length?(periodFailed.length?`${periodFailed.length} не выполнено · можно вернуться к плану`:periodEvents.length-periodDone.length?'Осталось '+(periodEvents.length-periodDone.length)+' дел':'Все дела периода закрыты 🎉'):'Добавь дела в расписание';
    $('weekPercent').textContent=`${percent}%`;$('streakCount').textContent=`${getStreak()} дн.`;$('allDoneCount').textContent=allDone.length;$('weekXpText').textContent=`+${periodXP} XP чистыми за период`;
  }
  function renderTasks(){
    const events=eventsForCurrentView().sort((a,b)=>eventInterval(a).start-eventInterval(b).start);
    const filtered=events.filter(e=>taskFilter==='all'||(taskFilter==='done'?e.done:taskFilter==='failed'?e.failed:!e.done&&!e.failed));
    document.querySelectorAll('[data-task-filter]').forEach(b=>b.classList.toggle('active',b.dataset.taskFilter===taskFilter));
    $('taskHeading').textContent=calendarView==='day'?'Задачи дня':calendarView==='month'?'Задачи месяца':'Задачи недели';
    const doneCount=events.filter(e=>e.done).length,failedCount=events.filter(e=>e.failed).length;
    $('taskSummary').textContent=`${doneCount} сделано · ${failedCount} не выполнено · ${events.length-doneCount-failedCount} в планах`;
    $('taskTotalBadge').textContent=`${events.length} ${events.length===1?'дело':'дел'}`;
    $('taskList').innerHTML=filtered.length?filtered.map(e=>{
      const c=category(e.categoryId),range=eventInterval(e),dateLabel=range.start.toLocaleDateString('ru-RU',{weekday:'short',day:'numeric',month:'short'}).replace('.','');
      const endLabel=toISO(range.start)===toISO(range.end)?'':` → ${range.end.toLocaleDateString('ru-RU',{weekday:'short',day:'numeric',month:'short'}).replace('.','')}`;
      const timeLabel=`${e.start}${endLabel} · ${e.end}`;
      const reward=e.done?(Number(e.earnedXP)||0):(!e.failed?(Number(c.xp)||0):0);
      const statusMark=e.done?'✓':e.failed?'×':'·';
      const rewardMarkup=e.failed?(Number(e.penaltyXP)||0)>0?`<span class="task-penalty" title="Фактически списано: ${Number(e.penaltyApplied)||0} XP">−${Number(e.penaltyApplied)||0} / ${Number(e.penaltyXP)||0} XP</span>`:`<span class="no-xp">БЕЗ ШТРАФА</span>`:reward>0?`<span class="xp-reward">${e.done?'✓ ':'+'}${reward} XP</span>`:`<span class="no-xp">БЕЗ XP</span>`;
      const statusText=e.done?'ГОТОВО':e.failed?'НЕ ВЫПОЛНЕНО':'В ПЛАНАХ';
      return `<article class="task-item ${e.done?'completed':''} ${e.failed?'failed':''}"><span class="task-status-mark">${statusMark}</span><div class="task-main"><div class="task-title-line"><span class="task-title">${escapeHTML(e.title)}</span><span class="event-status ${e.failed?'failed-status':''}">${statusText}</span></div><div class="task-meta"><span class="task-category"><i class="dot" style="background:${c.color}"></i>${escapeHTML(c.name)}</span><span>•</span><span>${escapeHTML(dateLabel)} ${escapeHTML(timeLabel)}</span>${e.notes?`<span class="task-note">• ${escapeHTML(e.notes)}</span>`:''}</div></div><div class="task-side"><div class="task-state-actions"><button type="button" class="task-state-btn done ${e.done?'active':''}" data-task-status="done" data-task-id="${escapeHTML(e.id)}" title="${e.done?'Вернуть в планы':'Отметить выполненным'}">✓ Сделано</button><button type="button" class="task-state-btn failed ${e.failed?'active':''}" data-task-status="failed" data-task-id="${escapeHTML(e.id)}" title="${e.failed?'Вернуть в планы':'Отметить как невыполненное'}">× Не выполнено</button></div>${rewardMarkup}${e.done&&Number(e.earnedCoins)>0?`<span class="coin-reward">+${Number(e.earnedCoins)} 🪙</span>`:!e.coinsAwarded&&coinRewardForCategory(e.categoryId)>0?`<span class="coin-reward">до +${coinRewardForCategory(e.categoryId)} 🪙</span>`:''}<button type="button" class="task-edit" data-task-open="${escapeHTML(e.id)}" aria-label="Изменить дело">✎</button></div></article>`;
    }).join(''):`<div class="task-empty">${events.length?'В этой категории пока нет задач.':'Добавь первое дело в расписание — здесь появится твой список задач ✨'}</div>`;
    const groups=state.categories.map(c=>({c,items:events.filter(e=>e.categoryId===c.id)})).filter(x=>x.items.length);
    $('categoryProgress').innerHTML=groups.length?groups.map(({c,items})=>{const done=items.filter(e=>e.done).length,pct=Math.round(done/items.length*100);const failed=items.filter(e=>e.failed).length;return `<div class="cat-progress-row"><div class="cat-progress-head"><span class="cat-progress-name"><i class="dot" style="background:${c.color}"></i>${escapeHTML(c.name)}</span><span class="cat-progress-value">${done}/${items.length} · ${failed?failed+' пропуск':''}</span></div><div class="cat-progress-track"><div class="cat-progress-fill" style="width:${pct}%;background:${c.color}"></div></div></div>`}).join(''):`<div class="task-empty">Запланируй работу, спорт или отдых — здесь появится статистика по категориям.</div>`;
  }
  let statsRange='30';
  function withinRange(iso, cutoff){return !!iso && (cutoff==='0000-00-00'||iso>=cutoff);}
  function periodEvents(){
    const today=toISO(new Date());
    const cutoff=statsRange==='all'?'0000-00-00':toISO(addDays(parseISO(today),-(Number(statsRange)-1)));
    const completed=state.events.filter(e=>e.done&&e.completedAt&&withinRange(e.completedAt,cutoff));
    const failed=state.events.filter(e=>e.failed&&e.failedAt&&withinRange(e.failedAt,cutoff));
    const planned=state.events.filter(e=>e.date>=cutoff&&(e.date<=today||e.done||e.failed));
    return {cutoff,today,completed,failed,planned};
  }
  function renderStats(){
    const {cutoff,today,completed,failed,planned}=periodEvents();
    const xpEvents=completed.filter(e=>(Number(e.earnedXP)||0)>0);
    const periodEarn=xpEvents.reduce((n,e)=>n+(Number(e.earnedXP)||0),0);
    const periodPenalty=failed.reduce((n,e)=>n+(Number(e.penaltyApplied)||0),0);
    const periodNet=periodEarn-periodPenalty;
    const xp=Math.max(0,periodNet);
    const doneCount=completed.length,failedCount=failed.length;
    const rate=planned.length?Math.round(doneCount/planned.length*100):0;
    const hours=xpEvents.reduce((n,e)=>{const r=eventInterval(e);return n+Math.max(0,(r.end-r.start)/3600000)},0);
    $('statXP').textContent=(periodNet>0?'+':'')+periodNet.toLocaleString('ru-RU');
    $('statXPNote').textContent=`+${periodEarn} заработано · −${periodPenalty} штраф`;
    $('statDone').textContent=doneCount;
    $('statDoneNote').textContent=`${xpEvents.length} развивающих · ${completed.length-xpEvents.length} базовых`;
    $('statRate').textContent=`${rate}%`;
    $('statHours').textContent=`${hours.toFixed(hours%1?1:0)} ч`;
    $('statFailed').textContent=failedCount;
    $('statPenalty').textContent=periodPenalty;

    const dailyXp=new Map();
    for(let i=13;i>=0;i--){const d=addDays(parseISO(today),-i);dailyXp.set(toISO(d),0);}
    xpEvents.forEach(e=>{if(dailyXp.has(e.completedAt))dailyXp.set(e.completedAt,dailyXp.get(e.completedAt)+(Number(e.earnedXP)||0));});
    failed.forEach(e=>{if(dailyXp.has(e.failedAt))dailyXp.set(e.failedAt,dailyXp.get(e.failedAt)-(Number(e.penaltyApplied)||0));});
    const maxXP=Math.max(1,...dailyXp.values());
    $('xpTrendBars').innerHTML=[...dailyXp.entries()].map(([day,value],i)=>{
      const d=parseISO(day),height=value?Math.max(5,Math.max(0,value)/maxXP*100):2;
      const label=d.toLocaleDateString('ru-RU',{day:'numeric',month:'short'}).replace('.','');
      return `<div class="trend-bar-wrap" title="${escapeHTML(label)} · ${value} XP чистыми"><div class="trend-bar-outer"><i class="trend-bar-fill" style="height:${height}%;opacity:${value?1:.22};${value<0?'background:linear-gradient(180deg,#ff9ba8,#9c445d)':''}"></i></div><span>${i%2===0?d.getDate():''}</span></div>`;
    }).join('');
    const trendSum=[...dailyXp.values()].reduce((a,b)=>a+b,0);
    $('trendTotal').textContent=`${trendSum} XP чистыми за 14 дней`;
    $('trendCaption').textContent='Начисления минус штрафы · последние 14 дней';

    const productiveDates=new Map();
    xpEvents.forEach(e=>productiveDates.set(e.completedAt,(productiveDates.get(e.completedAt)||0)+(Number(e.earnedXP)||0)));
    const heatDays=Array.from({length:35},(_,i)=>addDays(parseISO(today),i-34));
    const maxHeat=Math.max(1,...productiveDates.values());
    $('activityHeatmap').innerHTML=heatDays.map(d=>{
      const iso=toISO(d),v=productiveDates.get(iso)||0,level=v===0?0:v<maxHeat*.25?1:v<maxHeat*.5?2:v<maxHeat*.75?3:4;
      return `<i class="heat-cell heat-${level}" title="${escapeHTML(fmtDateShort(iso))} · ${v} XP"></i>`;
    }).join('');

    const nowWeekStart=toISO(mondayOf(new Date())),nowWeekEnd=toISO(addDays(mondayOf(new Date()),7));
    const todayXpTasks=state.events.filter(e=>e.done&&e.completedAt===today&&(Number(e.earnedXP)||0)>0).length;
    const thisWeekXpTasks=state.events.filter(e=>e.done&&e.completedAt>=nowWeekStart&&e.completedAt<nowWeekEnd&&(Number(e.earnedXP)||0)>0).length;
    const dailyGoal=Math.max(0,Number(state.settings.dailyGoal)||0),weeklyGoal=Math.max(0,Number(state.settings.weeklyGoal)||0);
    $('dailyGoalInput').value=dailyGoal;$('weeklyGoalInput').value=weeklyGoal;
    $('dailyGoalText').textContent=`${todayXpTasks} / ${dailyGoal||'—'}`;
    $('weeklyGoalText').textContent=`${thisWeekXpTasks} / ${weeklyGoal||'—'}`;
    $('dailyGoalFill').style.width=`${dailyGoal?Math.min(100,todayXpTasks/dailyGoal*100):0}%`;
    $('weeklyGoalFill').style.width=`${weeklyGoal?Math.min(100,thisWeekXpTasks/weeklyGoal*100):0}%`;

    const currentStreak=getStreak(),bestStreak=getLongestStreak();
    const bestEntry=[...productiveDates.entries()].sort((a,b)=>b[1]-a[1])[0];
    $('currentStreak').textContent=`${currentStreak} ${currentStreak===1?'день':'дней'}`;
    $('bestStreak').textContent=`${bestStreak} ${bestStreak===1?'день':'дней'}`;
    $('bestDay').textContent=bestEntry?`${fmtDateShort(bestEntry[0])} · ${bestEntry[1]} XP`:'—';
    $('productiveDone').textContent=xpEvents.length;
    $('recordInsight').textContent=xpEvents.length?`Ты заработал ${periodEarn} XP и потерял ${periodPenalty}. Чистый результат: ${periodNet} XP. Отдых не отнимает серию и не считается провалом.`:'Начни с одного важного дела — и здесь появится твой первый рекорд.';

    const categoryRows=state.categories.map(c=>{
      const items=completed.filter(e=>e.categoryId===c.id),plannedItems=planned.filter(e=>e.categoryId===c.id),failedItems=failed.filter(e=>e.categoryId===c.id);
      const earned=items.reduce((n,e)=>n+(Number(e.earnedXP)||0),0),penalties=failedItems.reduce((n,e)=>n+(Number(e.penaltyApplied)||0),0);
      return {c,done:items.length,planned:plannedItems.length,failed:failedItems.length,earned,penalties};
    }).filter(x=>x.done||x.planned||x.failed).sort((a,b)=>b.earned-a.earned||b.done-a.done);
    $('statsCategoryList').innerHTML=categoryRows.length?categoryRows.map(({c,done,planned,failed,earned,penalties})=>{
      const pct=planned?Math.round(done/planned*100):100;
      return `<div class="stats-category-row"><div class="stats-category-head"><span><i class="dot" style="background:${c.color}"></i>${escapeHTML(c.name)}</span><b>${done}/${planned} · ${earned-penalties} XP ${failed?'· '+failed+' пропуск':''}</b></div><div class="stats-cat-track"><i style="width:${Math.min(100,pct)}%;background:${c.color}"></i></div></div>`;
    }).join(''):`<div class="task-empty">Запланируй и выполни несколько дел — здесь появится статистика по направлениям.</div>`;

    const recent=[...completed.map(e=>({...e,_when:e.completedAt,_kind:'done'})),...failed.map(e=>({...e,_when:e.failedAt,_kind:'failed'}))].sort((a,b)=>(b._when||'').localeCompare(a._when||'')).slice(0,10);
    $('statsHistory').innerHTML=recent.length?recent.map(e=>{
      const c=category(e.categoryId),earned=Number(e.earnedXP)||0,penalty=Number(e.penaltyApplied)||0,nominal=Number(e.penaltyXP)||0;
      return `<div class="history-row"><i class="dot" style="background:${c.color}"></i><div><b>${escapeHTML(e.title)}</b><small>${escapeHTML(c.name)} · ${escapeHTML(fmtDateShort(e._when))} · ${e._kind==='done'?'Сделано':'Не выполнено'}</small></div><strong class="${e._kind==='failed'?'history-no-xp':'history-xp'}">${e._kind==='failed'?(nominal?`−${penalty} / ${nominal} XP`:'Без штрафа'):earned?'+'+earned+' XP':'Без XP'}</strong></div>`;
    }).join(''):`<div class="task-empty">Отмеченные дела появятся здесь.</div>`;

    const totalXpAll=netXPAll(),level=Math.floor(totalXpAll/100)+1,intoLevel=totalXpAll%100;
    const rank=titleForLevel(level);
    $('statsLevelNum').textContent=level;$('statsLevelAllXP').textContent=`${totalXpAll} XP всего`;$('statsLevelFill').style.width=`${intoLevel}%`;$('statsLevelNext').textContent=`${100-intoLevel} XP до ${level+1} уровня`;$('statsCurrentTitle').textContent=rank.current;
    const totalProductive=state.events.filter(e=>e.done&&(Number(e.earnedXP)||0)>0).length;
    const workoutCount=state.events.filter(e=>e.done&&e.categoryId==='sport'&&(Number(e.earnedXP)||0)>0).length;
    const workCount=state.events.filter(e=>e.done&&e.categoryId==='work').length;
    const studyCount=state.events.filter(e=>e.done&&e.categoryId==='study').length;
    const cleanCount=state.events.filter(e=>e.done&&e.categoryId==='home').length;
    const projectCount=state.events.filter(e=>e.done&&e.categoryId==='project').length;
    const productiveDays=new Set(state.events.filter(e=>e.done&&(Number(e.earnedXP)||0)>0&&e.completedAt).map(e=>e.completedAt)).size;
    const metric=(value,goal)=>({pct:Math.min(100,Math.round(value/goal*100)),label:`${Math.min(value,goal)} / ${goal}`});
    const achievements=[
      {icon:'🌱',name:'Первый шаг',desc:'Выполни первое развивающее дело',ok:totalProductive>=1,value:totalProductive,goal:1},
      {icon:'⚡',name:'Ученик',desc:'Набери 100 чистых XP',ok:totalXpAll>=100,value:totalXpAll,goal:100},
      {icon:'🔥',name:'Сайянский дух',desc:'Открой 5 уровень',ok:level>=5,value:level,goal:5},
      {icon:'💥',name:'Суперсайян',desc:'Открой 10 уровень',ok:level>=10,value:level,goal:10},
      {icon:'👑',name:'Золотая аура',desc:'Открой 20 уровень',ok:level>=20,value:level,goal:20},
      {icon:'🐉',name:'Охотник за сферами',desc:'Собери 7 сфер — 700 чистых XP',ok:totalXpAll>=700,value:totalXpAll,goal:700},
      {icon:'🌌',name:'Энергия Ки',desc:'Набери 500 чистых XP',ok:totalXpAll>=500,value:totalXpAll,goal:500},
      {icon:'🏴‍☠️',name:'Первый в команде',desc:'Выполни 10 развивающих задач',ok:totalProductive>=10,value:totalProductive,goal:10},
      {icon:'🧭',name:'Курс на Гранд-Лайн',desc:'Выполни 50 важных задач',ok:totalProductive>=50,value:totalProductive,goal:50},
      {icon:'👒',name:'Король пиратов',desc:'Набери 2500 чистых XP',ok:totalXpAll>=2500,value:totalXpAll,goal:2500},
      {icon:'🥷',name:'Путь шиноби',desc:'Собери серию из 3 дней',ok:bestStreak>=3,value:bestStreak,goal:3},
      {icon:'🍃',name:'Дисциплина ниндзя',desc:'Собери серию из 7 дней',ok:bestStreak>=7,value:bestStreak,goal:7},
      {icon:'🌀',name:'Легенда деревни',desc:'Собери серию из 30 дней',ok:bestStreak>=30,value:bestStreak,goal:30},
      {icon:'🏋️',name:'Первые мышцы',desc:'Выполни 5 тренировок',ok:workoutCount>=5,value:workoutCount,goal:5},
      {icon:'🥊',name:'Боец',desc:'Выполни 25 тренировок',ok:workoutCount>=25,value:workoutCount,goal:25},
      {icon:'🏆',name:'Мастер формы',desc:'Выполни 50 тренировок',ok:workoutCount>=50,value:workoutCount,goal:50},
      {icon:'📚',name:'Любознательный',desc:'Выполни 10 учебных сессий',ok:studyCount>=10,value:studyCount,goal:10},
      {icon:'🧠',name:'Мышление мастера',desc:'Выполни 50 учебных сессий',ok:studyCount>=50,value:studyCount,goal:50},
      {icon:'💼',name:'Надёжный профи',desc:'Выполни 25 рабочих задач',ok:workCount>=25,value:workCount,goal:25},
      {icon:'🧹',name:'Порядок вокруг',desc:'Выполни 10 уборок',ok:cleanCount>=10,value:cleanCount,goal:10},
      {icon:'🛠️',name:'Создатель',desc:'Закрой 10 личных проектов',ok:projectCount>=10,value:projectCount,goal:10},
      {icon:'📅',name:'Постоянство',desc:'Прояви активность в 20 разных днях',ok:productiveDays>=20,value:productiveDays,goal:20},
      {icon:'🚀',name:'Двигатель прогресса',desc:'Выполни 100 развивающих задач',ok:totalProductive>=100,value:totalProductive,goal:100},
      {icon:'💎',name:'Легенда fristik',desc:'Открой 50 уровень',ok:level>=50,value:level,goal:50}
    ];
    $('achievementsGrid').innerHTML=achievements.map(a=>{const pct=Math.min(100,Math.round(a.value/a.goal*100));return `<div class="achievement-card ${a.ok?'unlocked':''}"><span>${a.ok?a.icon:'🔒'}</span><div><b>${escapeHTML(a.name)}</b><small>${escapeHTML(a.desc)}</small></div><i>${a.ok?'ОТКРЫТО':`${a.label||Math.floor(pct)+'% · '+a.value+'/'+a.goal}`}</i><div class="achievement-progress"><i style="width:${pct}%"></i></div></div>`}).join('');
    $('achievementCount').textContent=`${achievements.filter(a=>a.ok).length} / ${achievements.length} открыто`;

    const ballCount=Math.min(7,Math.floor(totalXpAll/100));
    $('dragonBalls').innerHTML=Array.from({length:7},(_,i)=>`<span class="dragon-ball ${i<ballCount?'collected':''}" title="Сфера ${i+1} · ${i+1}00 XP">${'★'.repeat(i+1)}</span>`).join('');
    $('dragonBallsNote').textContent=`${ballCount} / 7 сфер · ${Math.max(0,700-totalXpAll)} XP до полного набора`;
    $('grandLineFill').style.width=`${Math.min(100,totalXpAll/1000*100)}%`;
    $('grandLineText').textContent=`${Math.min(totalXpAll,1000)} / 1000 XP`;
    $('shinobiStreak').textContent=`${currentStreak} дн.`;$('animeNetXP').textContent=`${totalXpAll} XP`;
    renderEconomyStats();
  }
  function renderEconomyStats(){const ledger=state.economy.ledger||[];const earned=ledger.filter(x=>['task','minigame'].includes(x.type)).reduce((n,x)=>n+(Number(x.amount)||0),0);const spent=ledger.filter(x=>['purchase','case','craft'].includes(x.type)).reduce((n,x)=>n+(Number(x.amount)||0),0);const distinct=Object.keys(state.economy.ownedCards||{}).filter(k=>Number(state.economy.ownedCards[k])>0).length;const values=[['Заработано монет',earned.toLocaleString('ru-RU')+' 🪙'],['Потрачено',spent.toLocaleString('ru-RU')+' 🪙'],['Открыто кейсов',String(state.economy.totalCasesOpened||0)],['Карточек собрано',`${distinct} / ${cardCatalog().length}`]];$('economyStatsSummary').innerHTML=values.map(([label,value])=>`<div class="economy-stat"><span>${label}</span><b>${value}</b></div>`).join('');}

  let collectionFilter='all';

  let shopTab='cases',formFilter='all',pendingCaseReward=null,caseSpinTimer=null;
  const coinRewardMap={work:24,project:24,study:18,skills:18,sport:14,home:10,reading:9,admin:7};
  function coinRewardForCategory(categoryId){if(NO_XP_CATS.has(categoryId))return 0;if(Object.prototype.hasOwnProperty.call(coinRewardMap,categoryId))return Math.max(0,Number(coinRewardMap[categoryId])||0);const xp=Math.max(0,Number(category(categoryId).xp)||0);return Math.min(20,Math.round(xp*2));}
  function revokeTaskCoins(item){if(!item||!item.coinsAwarded||item.coinsReversed)return 0;const refund=Math.min(state.economy.coins,Math.max(0,Number(item.earnedCoins)||0));state.economy.coins=Math.max(0,state.economy.coins-refund);item.coinsReversed=true;state.economy.ledger.push({type:'revoke',amount:refund,taskId:item.id,date:toISO(new Date())});return refund;}
  function updateWalletUI(){if($('coinBalance'))$('coinBalance').textContent=state.economy.coins.toLocaleString('ru-RU');if($('shopCoinBalance'))$('shopCoinBalance').textContent=state.economy.coins.toLocaleString('ru-RU');if($('shopShardBalance'))$('shopShardBalance').textContent=state.economy.shards.toLocaleString('ru-RU');}
  function formMetricValue(key){const productive=state.events.filter(e=>e.done&&(Number(e.earnedXP)||0)>0);if(key==='level')return xpLevel();if(key==='xp')return netXPAll();if(key==='productive')return productive.length;if(key==='work')return productive.filter(e=>e.categoryId==='work').length;if(key==='study')return productive.filter(e=>e.categoryId==='study').length;if(key==='sport')return productive.filter(e=>e.categoryId==='sport').length;if(key==='streak')return getLongestStreak();return 0;}
  function formIsUnlocked(f){return state.collection.unlocked.includes(f.characterId)&&f.level<=formMetricValue('level')&&f.xp<=formMetricValue('xp')&&(f.extraRequirements||[]).every(r=>formMetricValue(r.metric)>=r.target);}
  function formProgress(f){const metrics=[['level',f.level],['xp',f.xp],...(f.extraRequirements||[]).map(r=>[r.metric,r.target])];return Math.round(Math.min(...metrics.map(([key,target])=>Math.min(1,formMetricValue(key)/target)))*100);}
  function formRequirementText(f){return [`Уровень ${f.level}`,`${f.xp.toLocaleString('ru-RU')} XP`,...(f.extraRequirements||[]).map(r=>`${r.label}: ${Math.min(formMetricValue(r.metric),r.target)}/${r.target}`)].join(' · ');}
  function syncFormUnlocks(notify=true){const newly=[];FORM_SKINS.forEach(f=>{if(formIsUnlocked(f)&&!state.collection.formsUnlocked.includes(f.id)){state.collection.formsUnlocked.push(f.id);newly.push(f);}});if(newly.length){save();if(notify)toast(`Новая форма открыта: ${newly[0].name}${newly.length>1?` и ещё ${newly.length-1}`:''} ✨`);}return newly;}
  function getFormImage(f){return FORM_IMAGES[f.imgKey]||'';}
  function playTransformationEffect(){const el=$('activeHeroArt');if(!el)return;el.classList.remove('transform-burst');void el.offsetWidth;el.classList.add('transform-burst');clearTimeout(playTransformationEffect.t);playTransformationEffect.t=setTimeout(()=>el.classList.remove('transform-burst'),950);}
  function renderForms(){
    if(!$('formsGrid'))return;
    const open=new Set(state.collection.formsUnlocked),shown=FORM_SKINS.filter(f=>formFilter==='all'||(formFilter==='unlocked'?open.has(f.id):!open.has(f.id)));
    $('formsCount').textContent=`${open.size} / ${FORM_SKINS.length}`;
    $('formsGrid').innerHTML=shown.map(f=>{const unlocked=open.has(f.id),active=state.collection.activeForms[f.characterId]===f.id,progress=formProgress(f),char=CHARACTERS.find(c=>c.id===f.characterId);return `<article class="form-card ${unlocked?'open':'locked'} ${active?'active':''}" style="--form-color:${f.rarityKey==='legendary'||f.rarityKey==='mythic'?'#efc86f':f.rarityKey==='epic'?'#b28aff':f.rarityKey==='rare'?'#59c4e8':'#9e9abf'}"><img src="${getFormImage(f)}" alt="${escapeHTML(f.name)}" loading="eager"><div class="form-meta"><small>${escapeHTML(char?.name||'Герой')}</small><span class="rarity-pill rarity-${f.rarityKey}">${f.rarity.toUpperCase()}</span></div><h3>${escapeHTML(f.name)}</h3><p>${escapeHTML(f.description)}</p>${unlocked?`<button class="btn ${active?'':'primary'} small" type="button" data-form-select="${f.id}" ${active?'disabled':''}>${active?'✓ Активна':'Выбрать форму'}</button>`:`<div class="form-req-caption">${escapeHTML(formRequirementText(f))}</div><div class="form-progress"><i style="width:${progress}%"></i></div><button class="btn small" type="button" disabled>${progress}% · условия</button>`}</article>`;}).join('')||'<div class="collection-empty">В этом фильтре пока пусто.</div>';
    const activeId=state.collection.active,activeFormId=state.collection.activeForms[activeId],activeForm=FORM_SKINS.find(f=>f.id===activeFormId&&open.has(f.id)),activeChar=CHARACTERS.find(c=>c.id===activeId);
    if(activeChar&&$('activeHeroArt')){$('activeHeroArt').innerHTML=`<span class="spotlight-aura"></span><img src="${activeForm?getFormImage(activeForm):activeChar.img}" alt="${escapeHTML(activeForm?.name||activeChar.name)}" />`;if($('activeHeroQuote')&&activeForm)$('activeHeroQuote').textContent=`${activeChar.quote} · Форма: ${activeForm.name}`;}
  }
  function renderEconomyUI(){updateWalletUI();document.body.dataset.equippedCosmetic=state.economy.equippedItems.profile||'';if($('shopPage')&&!$('shopPage').classList.contains('hidden'))renderShop();}
  function renderShop(){
    updateWalletUI();
    document.querySelectorAll('[data-shop-tab]').forEach(b=>b.classList.toggle('active',b.dataset.shopTab===shopTab));
    ['cases','market','cards'].forEach(tab=>$('shop'+tab[0].toUpperCase()+tab.slice(1)+'View')?.classList.toggle('hidden',shopTab!==tab));
    const cardPool=cardCatalog();
    if($('caseGrid'))$('caseGrid').innerHTML=CASE_TYPES.map(c=>`<article class="case-card" style="--case-glow:${c.tone}55"><div class="case-art"><img class="case-cover" src="${c.image}" alt="${escapeHTML(c.name)}" loading="eager"></div><h3>${c.name}</h3><p>${c.desc}</p><div class="rarity-mini">${Object.entries(c.odds).map(([r,v])=>`<i>${rarityLabel(r)} ${v}%</i>`).join('')}</div><div class="case-price"><b>🪙 ${c.price}</b><small>${state.economy.coins>=c.price?'Можно открыть':'Не хватает монет'}</small></div><button type="button" class="btn primary small" data-open-case="${c.id}" ${state.economy.coins<c.price?'disabled':''}>Открыть кейс</button></article>`).join('');
    if($('oddsGrid'))$('oddsGrid').innerHTML=CASE_TYPES.map(c=>`<div class="odds-card"><b>${c.name}</b>${Object.entries(c.odds).map(([r,v])=>`<div class="odds-line"><span>${rarityLabel(r)}</span><strong>${v}%</strong></div>`).join('')}</div>`).join('');
    if($('pityText'))$('pityText').textContent=`До гарантированной эпической карточки: ${Math.max(0,10-(Number(state.economy.epicPity)||0))} открытий`;
    if($('marketGrid'))$('marketGrid').innerHTML=MARKET_ITEMS.map(item=>{const owned=state.economy.ownedItems.includes(item.id),equipped=Object.values(state.economy.equippedItems).includes(item.id);return `<article class="market-item ${owned?'owned':''}"><div class="market-item-art">${item.icon}</div><h3>${item.name}</h3><p>${item.desc}</p><div class="market-item-foot"><b>${owned?'Куплено':`🪙 ${item.price}`}</b>${owned?`<button class="btn small ${equipped?'':'primary'}" data-equip-item="${item.id}" type="button">${equipped?'Надето':'Надеть'}</button>`:`<button class="btn primary small" data-buy-item="${item.id}" type="button" ${state.economy.coins<item.price?'disabled':''}>Купить</button>`}</div></article>`;}).join('');
    if($('cardAlbumGrid')){$('cardsCount').textContent=`${Object.keys(state.economy.ownedCards).filter(k=>state.economy.ownedCards[k]>0).length} / ${cardPool.length}`;$('cardAlbumGrid').innerHTML=cardPool.map(card=>{const count=Number(state.economy.ownedCards[card.id])||0;const rarityColor=({common:'#a8adbf',rare:'#69c4e8',epic:'#b58bff',legendary:'#f2ce76'})[card.rarity];return `<article class="collectible-card ${count?'':'locked'}" style="--card-rarity:${rarityColor}"><span class="collectible-count">${count?'×'+count:'?'}</span><img src="${card.img}" alt="${escapeHTML(card.name)}" loading="eager"><h4>${count?escapeHTML(card.name):'Не открыта'}</h4><small>${count?'Есть в альбоме':'Найди в кейсе'}</small><br><span class="rarity-pill rarity-${card.rarity}">${rarityLabel(card.rarity).toUpperCase()}</span></article>`;}).join('');}
  }
  function rarityLabel(key){return ({common:'Обычная',rare:'Редкая',epic:'Эпическая',legendary:'Легендарная',mythic:'Мифическая'})[key]||'Обычная';}
  function weightedRarity(caseDef){const entries=Object.entries(caseDef.odds);let r=Math.random()*100;for(const [key,weight] of entries){r-=weight;if(r<=0)return key;}return 'common';}
  function drawCard(caseDef){let rarity=weightedRarity(caseDef);if((Number(state.economy.epicPity)||0)>=9){const high=['epic','legendary'];rarity=high[Math.floor(Math.random()*high.length)];}const pool=cardCatalog();let choices=pool.filter(c=>c.rarity===rarity);if(!choices.length){const order=['common','rare','epic','legendary'];const idx=order.indexOf(rarity);for(let i=idx-1;i>=0&&!choices.length;i--)choices=pool.filter(c=>c.rarity===order[i]);}return choices[Math.floor(Math.random()*choices.length)]||pool[0];}
  function cardTile(card){return `<div class="reel-tile" style="--card-rarity:${({common:'#a8adbf',rare:'#69c4e8',epic:'#b58bff',legendary:'#f2ce76'})[card.rarity]}"><img src="${card.img}" alt=""><span>${escapeHTML(card.name)}</span></div>`;}
  function revealCaseReward(){if(!pendingCaseReward)return;clearTimeout(caseSpinTimer);const reward=pendingCaseReward;pendingCaseReward=null;const previous=Number(state.economy.ownedCards[reward.card.id])||0;state.economy.ownedCards[reward.card.id]=previous+1;state.economy.totalCasesOpened=(Number(state.economy.totalCasesOpened)||0)+1;const tier=['epic','legendary'].includes(reward.card.rarity);state.economy.epicPity=tier?0:(Number(state.economy.epicPity)||0)+1;let shard=0;if(previous>0){shard=({common:5,rare:10,epic:25,legendary:50})[reward.card.rarity]||5;state.economy.shards+=shard;}state.economy.ledger.push({type:'case',caseId:reward.caseId,cardId:reward.card.id,date:toISO(new Date()),duplicate:previous>0,shards:shard});save();$('caseResult').classList.remove('hidden');$('caseResult').innerHTML=`<img src="${reward.card.img}" alt="${escapeHTML(reward.card.name)}"><div><span class="rarity-pill rarity-${reward.card.rarity}">${rarityLabel(reward.card.rarity).toUpperCase()}</span><h3>${previous?'Повторная карточка!':'Новая карточка!'}</h3><p>${escapeHTML(reward.card.name)}${previous?` · +${shard} осколков за повтор`:' добавлена в твой альбом.'}</p><small style="color:#9fb0cb">Открыто кейсов: ${state.economy.totalCasesOpened}</small></div>`;$('skipCaseSpin').classList.add('hidden');$('closeCaseResult').classList.remove('hidden');renderShop();}
  function openCase(caseId){const c=CASE_TYPES.find(x=>x.id===caseId);if(!c)return;if(state.economy.coins<c.price){toast('Не хватает монет. Выполни важные задачи и возвращайся!');return;}state.economy.coins-=c.price;const card=drawCard(c);pendingCaseReward={caseId:c.id,card};save();renderEconomyUI();$('caseModalTitle').textContent=`${c.name} · открытие`;const reel=[];for(let i=0;i<25;i++)reel.push(i===19?card:cardCatalog()[Math.floor(Math.random()*cardCatalog().length)]);$('caseReel').innerHTML=reel.map(cardTile).join('');$('caseResult').classList.add('hidden');$('skipCaseSpin').classList.remove('hidden');$('closeCaseResult').classList.add('hidden');$('caseModal').classList.add('open');const track=$('caseReel'),viewport=$('caseWindow');track.style.transition='none';track.style.transform='translateX(0)';requestAnimationFrame(()=>requestAnimationFrame(()=>{const first=track.querySelector('.reel-tile');const tileW=first.getBoundingClientRect().width+9;const targetOffset=19*tileW+tileW/2-viewport.clientWidth/2;track.style.transition='transform 3.5s cubic-bezier(.10,.78,.12,1)';track.style.transform=`translateX(-${Math.max(0,targetOffset)}px)`;}));caseSpinTimer=setTimeout(revealCaseReward,3650);}
  function finishCase(){if(pendingCaseReward)revealCaseReward();else $('caseModal').classList.remove('open');}
  function buyMarketItem(id){const item=MARKET_ITEMS.find(x=>x.id===id);if(!item)return;if(state.economy.ownedItems.includes(id)){toast('Этот предмет уже есть у тебя');return;}if(state.economy.coins<item.price){toast('Не хватает монет');return;}state.economy.coins-=item.price;state.economy.ownedItems.push(id);state.economy.ledger.push({type:'purchase',itemId:id,amount:item.price,date:toISO(new Date())});save();renderShop();toast(`${item.name} теперь твой!`);}
  function equipMarketItem(id){if(!state.economy.ownedItems.includes(id))return;state.economy.equippedItems.profile=id;save();renderShop();toast('Предмет применён к профилю ✨');}
  function craftCard(rarity){const costs={rare:60,epic:140,legendary:300},cost=costs[rarity];if(state.economy.shards<cost){toast(`Нужно ещё ${cost-state.economy.shards} осколков`);return;}const pool=cardCatalog().filter(c=>c.rarity===rarity&&!state.economy.ownedCards[c.id]);if(!pool.length){toast('Все карточки этой редкости уже собраны');return;}const card=pool[Math.floor(Math.random()*pool.length)];state.economy.shards-=cost;state.economy.ownedCards[card.id]=1;state.economy.ledger.push({type:'craft',cardId:card.id,amount:cost,date:toISO(new Date())});save();renderShop();toast(`Создана карточка: ${card.name} 💎`);}

  function getCollectionMetrics(){
    const productive=state.events.filter(e=>e.done&&(Number(e.earnedXP)||0)>0);
    return {
      level:xpLevel(), productive:productive.length,
      work:productive.filter(e=>e.categoryId==='work').length,
      study:productive.filter(e=>e.categoryId==='study').length,
      sport:productive.filter(e=>e.categoryId==='sport').length,
      streak:getLongestStreak()
    };
  }
  function requirementValue(req,metrics){return Math.max(0,Number(metrics[req.metric])||0);}
  function characterRequirementsMet(ch,metrics){return ch.requirements.every(req=>requirementValue(req,metrics)>=req.target);}
  function characterProgress(ch,metrics){
    if(!ch.requirements.length)return 100;
    const ratios=ch.requirements.map(req=>Math.min(1,requirementValue(req,metrics)/req.target));
    return Math.round(Math.min(...ratios)*100);
  }
  function characterRequirementSummary(ch,metrics){
    if(!ch.requirements.length)return 'Стартовый герой · доступен сразу';
    return ch.requirements.map(req=>`${req.label.replace('Достигни ','ур. ').replace('Выполни ','')}: ${Math.min(requirementValue(req,metrics),req.target)}/${req.target}`).join(' · ');
  }
  function syncCollectionUnlocks(notify=true){
    const metrics=getCollectionMetrics();
    const before=new Set(state.collection.unlocked);
    const newly=[];
    CHARACTERS.forEach(ch=>{
      if(characterRequirementsMet(ch,metrics)&&!before.has(ch.id)){
        state.collection.unlocked.push(ch.id);newly.push(ch);
      }
    });
    if(!state.collection.unlocked.includes('goku'))state.collection.unlocked.unshift('goku');
    if(!state.collection.unlocked.includes(state.collection.active))state.collection.active='goku';
    if(newly.length)save();
    if(notify&&newly.length)showCharacterUnlock(newly);
    return newly;
  }
  function renderCollection(){
    const metrics=getCollectionMetrics();
    const unlocked=new Set(state.collection.unlocked);
    const active=CHARACTERS.find(c=>c.id===state.collection.active&&unlocked.has(c.id))||CHARACTERS[0];
    const count=unlocked.size;
    $('collectionUnlockedCount').textContent=`${count} / ${CHARACTERS.length}`;
    $('collectionAllCount').textContent=CHARACTERS.length;
    $('collectionOpenCount').textContent=count;
    $('collectionLockedCount').textContent=CHARACTERS.length-count;
    $('collectionProgressLabel').textContent=`${count} из ${CHARACTERS.length}`;
    $('collectionProgressFill').style.width=`${count/CHARACTERS.length*100}%`;
    const next=CHARACTERS.find(c=>!unlocked.has(c.id));
    $('collectionNextUnlock').textContent=next?`Следующий: ${next.name} · ${characterRequirementSummary(next,metrics)}`:'Коллекция собрана полностью. Ты собрал свою команду!';
    $('activeHeroName').textContent=active.name;
    $('activeHeroQuote').textContent='«'+active.quote+'»';
    $('activeHeroAnime').textContent=active.series;
    $('activeHeroRarity').textContent=active.rarity.toUpperCase();
    $('activeHeroRarity').className=`rarity-pill rarity-${active.rarityKey}`;
    const selectedForm=FORM_SKINS.find(f=>f.id===state.collection.activeForms[active.id]&&state.collection.formsUnlocked.includes(f.id));$('activeHeroArt').innerHTML=`<span class="spotlight-aura"></span><img src="${selectedForm?getFormImage(selectedForm):active.img}" alt="${escapeHTML(selectedForm?.name||active.name)}" />`;
    $('activeHeroDetails').dataset.characterInfo=active.id;
    document.querySelectorAll('[data-collection-filter]').forEach(b=>b.classList.toggle('active',b.dataset.collectionFilter===collectionFilter));
    const shown=CHARACTERS.filter(ch=>collectionFilter==='all'||(collectionFilter==='unlocked'?unlocked.has(ch.id):!unlocked.has(ch.id)));
    $('collectionGrid').innerHTML=shown.map(ch=>{
      const isOpen=unlocked.has(ch.id),isActive=active.id===ch.id,pct=characterProgress(ch,metrics);
      const reqSummary=characterRequirementSummary(ch,metrics);
      return `<article class="character-card ${isOpen?'is-open':'is-locked'} ${isActive?'is-active':''}">
        <div class="character-art"><img src="${ch.img}" alt="${escapeHTML(ch.name)}" loading="eager"/><div class="character-art-top"><span class="character-series">${ch.series}</span><span class="rarity-pill rarity-${ch.rarityKey}">${ch.rarity.toUpperCase()}</span></div>${isOpen?'':`<div class="character-locked-overlay"><span>🔒</span></div>`}</div>
        <div class="character-card-info"><div class="character-name-line"><h3>${escapeHTML(ch.name)}</h3><small>${isOpen?(isActive?'АКТИВНЫЙ ГЕРОЙ':'ОТКРЫТ'):'ЗАКРЫТ'}</small></div><p class="character-role">${escapeHTML(ch.role)}</p>
        <div class="character-unlock-note">${isOpen?`<b>✦ Персонаж открыт</b><br>${isActive?'Сейчас выбран в профиле':'Можно выбрать активным героем'}`:`<b>Условия открытия</b><br>${escapeHTML(reqSummary)}`}</div>
        ${isOpen?'':`<div class="character-progress-mini"><i style="width:${pct}%"></i></div>`}
        <div class="character-card-actions"><button class="btn small" type="button" data-character-info="${ch.id}">${isOpen?'Подробнее':'Условия'}</button>${isOpen?`<button class="btn primary small select-character-btn" type="button" data-character-select="${ch.id}" ${isActive?'disabled':''}>${isActive?'✓ Выбран':'Выбрать'}</button>`:''}</div></div>
      </article>`;
    }).join('')||'<div class="collection-empty">В этой категории пока нет персонажей.</div>';
    renderForms();
  }
  function showCharacterDetails(id){
    const ch=CHARACTERS.find(c=>c.id===id);if(!ch)return;
    const metrics=getCollectionMetrics(),isOpen=state.collection.unlocked.includes(id),pct=characterProgress(ch,metrics);
    const reqs=ch.requirements.length?ch.requirements.map(req=>{
      const value=requirementValue(req,metrics),ratio=Math.min(100,Math.round(value/req.target*100));
      return `<div class="character-req"><div class="character-req-top"><span>${escapeHTML(req.label)}</span><b>${Math.min(value,req.target)} / ${req.target}</b></div><div class="character-req-track"><i style="width:${ratio}%"></i></div></div>`;
    }).join(''):'<div class="character-req"><div class="character-req-top"><span>Стартовый персонаж</span><b>Открыт</b></div></div>';
    $('characterModalTitle').textContent=ch.name;
    $('characterDetail').innerHTML=`<div class="character-detail-layout"><div class="character-detail-art"><img src="${ch.img}" alt="${escapeHTML(ch.name)}"/></div><div class="character-detail-copy"><span class="character-series">${ch.series}</span><h3>${escapeHTML(ch.name)}</h3><span class="rarity-pill rarity-${ch.rarityKey}">${ch.rarity.toUpperCase()}</span><p>${escapeHTML(ch.role)}</p><p>«${escapeHTML(ch.quote)}»</p></div></div><div class="section-heading compact" style="margin-top:15px"><div><h2>${isOpen?'Персонаж открыт':'Условия открытия'}</h2><p>${isOpen?'Он останется в твоей коллекции навсегда.':`Прогресс открытия: ${pct}%`}</p></div></div><div class="character-req-list">${reqs}</div><div class="character-detail-foot"><small>${isOpen?(state.collection.active===id?'Сейчас выбран как активный герой.':'Доступен для выбора в профиле.'):'Выполняй условия — прогресс обновится автоматически.'}</small>${isOpen?`<button class="btn primary small" data-character-select="${id}" type="button">${state.collection.active===id?'Уже выбран':'Выбрать героя'}</button>`:''}</div>`;
    $('characterModal').classList.add('open');
  }
  let unlockCharacterId=null;
  function showCharacterUnlock(chars){
    const ch=chars[0];if(!ch)return;unlockCharacterId=ch.id;
    $('unlockModalContent').innerHTML=`<div class="unlock-art"><img src="${ch.img}" alt="${escapeHTML(ch.name)}"/></div><span class="eyebrow">НОВЫЙ ГЕРОЙ В КОЛЛЕКЦИИ</span><h3>${escapeHTML(ch.name)} открыт!</h3><p>${escapeHTML(ch.seriesName)} · ${ch.rarity}. Ты выполнил условия и пополнил свою команду.${chars.length>1?` Ещё открыто персонажей: ${chars.length-1}.`:''}</p>`;
    $('unlockModal').classList.add('open');
  }
  function chooseCharacter(id){
    if(!state.collection.unlocked.includes(id))return;
    state.collection.active=id;save();renderCollection();toast(`${CHARACTERS.find(c=>c.id===id)?.name||'Герой'} выбран в профиль ✦`);
    $('characterModal').classList.remove('open');$('unlockModal').classList.remove('open');
  }

  // Browser reminders: they are evaluated while the planner tab is open.
  let reminderTimer=null;
  function upcomingEvents(){
    const now=new Date(),limit=addDays(now,1);
    return state.events.filter(e=>!e.done&&!e.failed).map(e=>({event:e,start:eventInterval(e).start})).filter(x=>x.start>=now&&x.start<=limit).sort((a,b)=>a.start-b.start);
  }
  function updateNotificationPanel(){
    const panel=$('notificationPanel');if(!panel)return;
    const supported='Notification' in window;
    const permission=supported?Notification.permission:'unsupported';
    const enabled=!!state.notifications.enabled&&permission==='granted';
    $('notificationStatus').textContent=!supported?'Браузер не поддерживает уведомления':permission==='denied'?'Разрешение запрещено в браузере':enabled?'Напоминания включены':'Уведомления выключены';
    $('enableNotificationsBtn').textContent=enabled?'Выключить уведомления':permission==='denied'?'Разрешить в настройках браузера':'Включить уведомления';
    $('enableNotificationsBtn').disabled=permission==='denied'||!supported;
    $('reminderLead').value=String(state.notifications.leadMinutes);
    const next=upcomingEvents();
    $('notificationUpcoming').innerHTML=next.length?next.slice(0,4).map(({event,start})=>`<div class="notification-upcoming-item"><span class="notification-upcoming-dot"></span><span><b>${escapeHTML(event.title)}</b><small>${start.toLocaleDateString('ru-RU',{weekday:'short',day:'numeric',month:'short'})} · ${pad(start.getHours())}:${pad(start.getMinutes())}</small></span></div>`).join(''):'<small>В ближайшие 24 часа новых дел нет.</small>';
    const badge=$('notificationBadge');badge.textContent=String(next.length);badge.classList.toggle('hidden',next.length===0);
    $('notificationBtn').setAttribute('aria-expanded',String(!panel.classList.contains('hidden')));
  }
  async function enableBrowserNotifications(){
    if(!('Notification' in window)){toast('Этот браузер не поддерживает уведомления');return;}
    if(!window.isSecureContext){toast('Уведомления доступны после публикации по HTTPS');return;}
    if(Notification.permission==='denied'){toast('Разреши уведомления для сайта в настройках браузера');return;}
    let permission=Notification.permission;
    if(permission==='default')permission=await Notification.requestPermission();
    if(permission==='granted'){
      state.notifications.enabled=true;save();updateNotificationPanel();toast('Уведомления включены 🔔');
      showPlannerNotification('fristik.planner работает','Напоминания о запланированных делах включены.');
      checkUpcomingNotifications();
    }else{state.notifications.enabled=false;save();updateNotificationPanel();toast('Браузер не разрешил уведомления');}
  }
  function showPlannerNotification(title,body,tag='fristik-planner-reminder'){
    const options={body,icon:new URL('./assets/app-icon-192.png',document.baseURI).href,badge:new URL('./assets/app-icon-192.png',document.baseURI).href,tag,renotify:false};
    if('serviceWorker' in navigator){navigator.serviceWorker.ready.then(reg=>reg.showNotification(title,options)).catch(()=>{try{new Notification(title,options)}catch(e){console.warn(e)}});}
    else{try{new Notification(title,options)}catch(e){console.warn(e)}}
  }
  function checkUpcomingNotifications(){
    if(!state.notifications.enabled||!('Notification' in window)||Notification.permission!=='granted')return;
    const now=new Date(),lead=Number(state.notifications.leadMinutes)||0,seen=new Set(state.notifications.lastNotified);
    state.events.forEach(e=>{
      if(e.done||e.failed)return;
      const start=eventInterval(e).start,diff=start-now;
      const key=`${e.id}@${start.getTime()}`;
      if(diff>=0&&diff<=Math.max(lead*60000,30000)&&!seen.has(key)){
        const when=diff<=30000?'Начинается сейчас':`Начнётся через ${Math.max(1,Math.ceil(diff/60000))} мин.`;
        showPlannerNotification(`Скоро: ${e.title}`,`${when} · ${e.start}`,`fristik-reminder-${key}`);
        seen.add(key);
      }
    });
    state.notifications.lastNotified=[...seen].slice(-120);save();
  }
  function initNotifications(){
    $('notificationBtn').addEventListener('click',()=>{const p=$('notificationPanel');p.classList.toggle('hidden');updateNotificationPanel();});
    $('closeNotificationPanel').addEventListener('click',()=>{$('notificationPanel').classList.add('hidden');updateNotificationPanel();});
    $('enableNotificationsBtn').addEventListener('click',()=>{if(state.notifications.enabled&&('Notification' in window)&&Notification.permission==='granted'){state.notifications.enabled=false;save();updateNotificationPanel();toast('Напоминания выключены');}else enableBrowserNotifications();});
    $('reminderLead').addEventListener('change',()=>{state.notifications.leadMinutes=Number($('reminderLead').value)||0;save();updateNotificationPanel();toast('Время напоминания обновлено');});
    document.addEventListener('click',e=>{if(!$('notificationPanel').contains(e.target)&&!$('notificationBtn').contains(e.target))$('notificationPanel').classList.add('hidden');});
    updateNotificationPanel();checkUpcomingNotifications();reminderTimer=setInterval(checkUpcomingNotifications,30000);
  }
  function registerAppServiceWorker(){
    if(!('serviceWorker' in navigator)||!window.isSecureContext)return;
    navigator.serviceWorker.register('./sw.js').catch(err=>console.warn('Service worker registration failed',err));
  }

  // Mini-game: a short reaction drill with a capped once-per-day coin reward.
  let gameRunning=false,gameScore=0,gameSeconds=20,gameClock=null,gameSpawner=null,gameCountdownTimer=null;
  const gameArena=()=>$('gameArena');
  function renderGameInfo(){
    $('gameBestScore').textContent=String(state.game.bestScore||0);
    $('gameRewardStatus').textContent=state.game.rewardDate===toISO(new Date())?'Получена':'Не получена';
    $('gameScore').textContent=String(gameRunning?gameScore:(state.game.lastScore||0));
    $('gameTimer').textContent=String(gameRunning?gameSeconds:20);
  }
  function spawnKiTarget(){
    if(!gameRunning)return;
    const target=document.createElement('button');
    const roll=Math.random(),kind=roll>.88?'trap':roll>.68?'gold':'normal';
    target.type='button';target.className=`ki-target ${kind}`;target.dataset.target=kind;
    target.textContent=kind==='trap'?'✕':kind==='gold'?'✦':'●';
    target.setAttribute('aria-label',kind==='trap'?'Ловушка':kind==='gold'?'Золотая сфера':'Сфера энергии');
    target.style.left=`${7+Math.random()*82}%`;target.style.top=`${8+Math.random()*78}%`;
    gameArena().appendChild(target);
    setTimeout(()=>target.remove(),kind==='trap'?900:1150);
  }
  function updateGameScore(){ $('gameScore').textContent=String(gameScore); }
  function finishMiniGame(){
    if(!gameRunning)return;gameRunning=false;clearInterval(gameClock);clearInterval(gameSpawner);clearInterval(gameCountdownTimer);gameArena().querySelectorAll('.ki-target').forEach(x=>x.remove());
    state.game.totalPlays=(Number(state.game.totalPlays)||0)+1;state.game.lastScore=gameScore;state.game.bestScore=Math.max(Number(state.game.bestScore)||0,gameScore);
    let reward=0,message='Хорошая разминка! Попробуй ещё раз и улучши рекорд.';
    if(gameScore>=8&&state.game.rewardDate!==toISO(new Date())){
      reward=gameScore>=22?15:gameScore>=15?10:5;state.economy.coins+=reward;state.game.rewardDate=toISO(new Date());
      state.economy.ledger.push({type:'minigame',amount:reward,date:toISO(new Date()),score:gameScore});
      message=`Отличная реакция! +${reward} монет за сегодняшнюю тренировку.`;
    }else if(state.game.rewardDate===toISO(new Date()))message='Сегодняшняя награда уже получена. Рекорд всё ещё можно улучшить!';
    else message='Нужно набрать хотя бы 8 очков для ежедневной награды. Можно сыграть ещё раз.';
    save();renderEconomyUI();updateWalletUI();renderGameInfo();
    $('gameRunStatus').textContent=message;
    $('gameIdle').classList.remove('hidden');$('gameIdle').innerHTML=`<div class="game-result-emblem">${gameScore>=22?'🏆':gameScore>=8?'⚡':'🎯'}</div><h3>${gameScore>=22?'Невероятная реакция!':gameScore>=8?'Тренировка завершена':'Попробуй ещё раз'}</h3><p>Твой результат: <b>${gameScore}</b> очков. ${escapeHTML(message)}</p><button class="btn primary game-start-btn" data-game-start type="button">Играть ещё раз</button>`;
    $('gameCountdown').classList.add('hidden');toast(message);
  }
  function startMiniGame(){
    if(gameRunning)return;gameRunning=true;gameScore=0;gameSeconds=20;
    $('gameIdle').classList.add('hidden');$('gameArena').querySelectorAll('.ki-target').forEach(x=>x.remove());
    $('gameCountdown').classList.remove('hidden');$('gameRunStatus').textContent='Приготовься…';updateGameScore();$('gameTimer').textContent='20';
    let count=3;$('gameCountdown').textContent=String(count);
    gameCountdownTimer=setInterval(()=>{count--;if(count>0){$('gameCountdown').textContent=String(count);}else{clearInterval(gameCountdownTimer);$('gameCountdown').classList.add('hidden');$('gameRunStatus').textContent='Лови сферы!';gameSpawner=setInterval(spawnKiTarget,520);gameClock=setInterval(()=>{gameSeconds--; $('gameTimer').textContent=String(gameSeconds);if(gameSeconds<=0)finishMiniGame();},1000);}},700);
  }
  function initMiniGame(){
    $('gameArena').addEventListener('click',e=>{
      const start=e.target.closest('[data-game-start],#startGameBtn');if(start){startMiniGame();return;}
      const target=e.target.closest('.ki-target');if(!target||!gameRunning)return;
      const kind=target.dataset.target;target.remove();gameScore=kind==='trap'?Math.max(0,gameScore-2):gameScore+(kind==='gold'?3:1);updateGameScore();
    });
  }

  function setPage(page){
    const pages={schedule:'schedulePage',stats:'statsPage',collection:'collectionPage',shop:'shopPage',game:'gamePage'};
    Object.entries(pages).forEach(([key,id])=>$(id).classList.toggle('hidden',key!==page));
    document.querySelectorAll('[data-page]').forEach(b=>b.classList.toggle('active',b.dataset.page===page));
    if(page==='stats')renderStats();
    if(page==='collection')renderCollection();if(page==='shop')renderShop();if(page==='game')renderGameInfo();
    window.scrollTo({top:0,behavior:'smooth'});
  }
  function renderTimelineDay(d,hourPx,showDayHead=true){
    const iso=toISO(d),isToday=iso===toISO(new Date());
    let html='<div class="time-head"></div>';
    if(showDayHead)html+=`<div class="day-head ${isToday?'today':''}"><div class="dow">${d.toLocaleDateString('ru-RU',{weekday:'long'})}</div><div class="date">${pad(d.getDate())} ${d.toLocaleDateString('ru-RU',{month:'long'})}</div></div>`;
    html+=`<div class="time-axis">${Array.from({length:24},(_,h)=>`<div class="time-label">${pad(h)}:00</div>`).join('')}</div>`;
    const dayEvents=allocateLanes(state.events.map(e=>segmentsForDay(e,iso)).filter(Boolean));
    html+=`<div class="day-column ${isToday?'today-col':''}" data-column-day="${iso}">`;
    for(let h=0;h<24;h++)html+=`<div class="slot-hit" style="top:${h*hourPx}px" data-date="${iso}" data-hour="${h}" aria-label="Добавить дело ${h}:00"></div>`;
    dayEvents.forEach(seg=>{
      const e=seg.event,start=seg.startMin,end=seg.endMin,c=category(e.categoryId);const top=(start/60)*hourPx,height=Math.max(25,((end-start)/60)*hourPx-3);
      let label;if(seg.continuesBefore)label=`Продолжение · 00:00 — ${time(end)}`;else if(seg.continuesAfter)label=`${time(start)} — 00:00 · далее`;else label=`${time(start)} — ${time(end)}`;
      const fullTime=`${fmtDateShort(e.date)} ${e.start} → ${fmtDateShort(e.endDate||e.date)} ${e.end}`;
      html+=`<button class="event ${e.done?'completed':e.failed?'failed':''}" data-event="${escapeHTML(e.id)}" data-segment-date="${iso}" style="--event-color:${c.color};top:${top+2}px;height:${height}px;left:calc(${seg._lane*100/Math.max(seg._laneCount,1)}% + 3px);width:calc(${100/Math.max(seg._laneCount,1)}% - 6px)" title="${escapeHTML(e.title)} · ${escapeHTML(fullTime)}"><span class="event-title"><i class="event-dot"></i>${escapeHTML(e.title)}${e.done?'<span class="event-status">✓</span>':e.failed?'<span class="event-status failed-status">×</span>':''}</span><span class="event-time">${escapeHTML(label)}</span>${height>76&&e.notes?`<span class="event-note">${escapeHTML(e.notes)}</span>`:''}</button>`;
    });
    return html+'</div>';
  }
  function renderWeekCalendar(hourPx){
    const dates=getWeekDates();let html='<div class="time-head"></div>';
    dates.forEach(d=>{const iso=toISO(d);html+=`<div class="day-head ${iso===toISO(new Date())?'today':''} ${iso===activeMobileDate?'active-mobile':''}" data-head-day="${iso}"><div class="dow">${d.toLocaleDateString('ru-RU',{weekday:'short'}).replace('.','')}</div><div class="date">${pad(d.getDate())}</div></div>`});
    html+='<div class="time-axis">'+Array.from({length:24},(_,h)=>`<div class="time-label">${pad(h)}:00</div>`).join('')+'</div>';
    dates.forEach(d=>{const iso=toISO(d),dayEvents=allocateLanes(state.events.map(e=>segmentsForDay(e,iso)).filter(Boolean));html+=`<div class="day-column ${iso===toISO(new Date())?'today-col':''} ${iso===activeMobileDate?'active-mobile':''}" data-column-day="${iso}">`;for(let h=0;h<24;h++)html+=`<div class="slot-hit" style="top:${h*hourPx}px" data-date="${iso}" data-hour="${h}" aria-label="Добавить дело ${h}:00"></div>`;dayEvents.forEach(seg=>{const e=seg.event,start=seg.startMin,end=seg.endMin,c=category(e.categoryId),top=start/60*hourPx,height=Math.max(25,(end-start)/60*hourPx-3),laneCount=Math.max(seg._laneCount,1),width=100/laneCount,left=seg._lane*width;let label=seg.continuesBefore?`Продолжение · 00:00 — ${time(end)}`:seg.continuesAfter?`${time(start)} — 00:00 · далее`:`${time(start)} — ${time(end)}`;const fullTime=`${fmtDateShort(e.date)} ${e.start} → ${fmtDateShort(e.endDate||e.date)} ${e.end}`;html+=`<button class="event ${e.done?'completed':e.failed?'failed':''}" data-event="${escapeHTML(e.id)}" data-segment-date="${iso}" style="--event-color:${c.color};top:${top+2}px;height:${height}px;left:calc(${left}% + 3px);width:calc(${width}% - 6px)" title="${escapeHTML(e.title)} · ${escapeHTML(fullTime)}"><span class="event-title"><i class="event-dot"></i>${escapeHTML(e.title)}${e.done?'<span class="event-status">✓</span>':e.failed?'<span class="event-status failed-status">×</span>':''}</span><span class="event-time">${escapeHTML(label)}</span>${height>76&&e.notes?`<span class="event-note">${escapeHTML(e.notes)}</span>`:''}</button>`});html+='</div>';});return html;
  }
  function renderMonthCalendar(){
    const anchor=parseISO(activeMobileDate),monthStart=new Date(anchor.getFullYear(),anchor.getMonth(),1,12),gridStart=mondayOf(monthStart),today=toISO(new Date());
    const weekdays=['Пн','Вт','Ср','Чт','Пт','Сб','Вс'];let html=weekdays.map(x=>`<div class="month-weekday">${x}</div>`).join('');
    for(let i=0;i<42;i++){
      const d=addDays(gridStart,i),iso=toISO(d),inMonth=d.getMonth()===monthStart.getMonth(),items=state.events.filter(e=>{const r=eventInterval(e),a=dayStart(iso),b=dayStart(toISO(addDays(d,1)));return r.start<b&&r.end>a}).sort((a,b)=>eventInterval(a).start-eventInterval(b).start);
      const preview=items.slice(0,3).map(e=>{const c=category(e.categoryId);return `<button type="button" class="month-event ${e.done?'completed':e.failed?'failed':''}" data-event="${escapeHTML(e.id)}" data-segment-date="${iso}" style="--event-color:${c.color}" title="${escapeHTML(e.title)} · ${e.start}"><i></i><span>${escapeHTML(e.start)} ${escapeHTML(e.title)}</span></button>`}).join('');
      html+=`<div class="month-cell ${inMonth?'':'outside-month'} ${iso===today?'today':''}" data-month-date="${iso}"><button type="button" class="month-date" data-month-date="${iso}" aria-label="Добавить дело ${iso}">${d.getDate()}</button><div class="month-events">${preview}</div>${items.length>3?`<small class="month-more">+${items.length-3} ещё</small>`:''}</div>`;
    }
    return html;
  }
  function updateViewToolbar(){
    document.querySelectorAll('[data-calendar-view]').forEach(b=>b.classList.toggle('active',b.dataset.calendarView===calendarView));
    const anchor=parseISO(activeMobileDate);
    if(calendarView==='day'){$('weekTitle').textContent=anchor.toLocaleDateString('ru-RU',{weekday:'long',day:'numeric',month:'long'});$('weekSubtitle').textContent='План на один день';}
    else if(calendarView==='month'){$('weekTitle').textContent=anchor.toLocaleDateString('ru-RU',{month:'long',year:'numeric'});$('weekSubtitle').textContent='Обзор всего месяца';}
    else{$('weekTitle').textContent=`${fmtShort(weekStart)} — ${fmtShort(addDays(weekStart,6))}`;$('weekSubtitle').textContent=`${weekStart.getFullYear()} · план на 7 дней`;}
    $('mobileDays').classList.toggle('hidden',calendarView!=='week');
  }
  function render(){
    syncCollectionUnlocks(true);syncFormUnlocks(true);renderEconomyUI();
    const hourPx=window.matchMedia('(max-width: 680px)').matches?58:64;
    updateViewToolbar();
    let html='';
    const grid=$('calendarGrid');grid.className='calendar-grid';
    if(calendarView==='month'){grid.classList.add('month-view');html=renderMonthCalendar();}
    else if(calendarView==='day'){grid.classList.add('day-view');html=renderTimelineDay(parseISO(activeMobileDate),hourPx,true);}
    else{html=renderWeekCalendar(hourPx);renderMobileDays(getWeekDates());}
    grid.innerHTML=html;
    const ev=eventsForCurrentView(),{start:rangeStart,end:rangeEnd}=currentViewRange();
    const total=ev.reduce((n,e)=>{const x=eventInterval(e);return n+Math.max(0,Math.min(x.end.getTime(),rangeEnd.getTime())-Math.max(x.start.getTime(),rangeStart.getTime()))/3600000},0);
    const activeDays=new Set();
    const daysInScope=Math.round((rangeEnd-rangeStart)/86400000);
    for(let d=new Date(rangeStart);d<rangeEnd;d=addDays(d,1)){const ds=dayStart(toISO(d)),de=dayStart(toISO(addDays(d,1)));if(ev.some(e=>{const x=eventInterval(e);return x.start<de&&x.end>ds}))activeDays.add(toISO(d));}
    $('eventCount').textContent=ev.length;$('plannedHours').textContent=`${Number.isInteger(total)?total:total.toFixed(1)} ч`;$('freeDays').textContent=Math.max(0,daysInScope-activeDays.size);
    $('emptyHint').style.display=ev.length?'none':'block';
    $('emptyHint').textContent=calendarView==='month'?'В этом месяце пока нет дел. Нажми на дату, чтобы добавить первое.':'Пока нет запланированных дел. Нажми на свободный час или «Добавить дело».';
    renderProgress();renderTasks();renderCollection();
    updateNotificationPanel();
  }
  let autoEndDate=false;
  let lastStartDate='';
  function syncEndDateMin(){const startDate=$('eventDate').value;$('eventEndDate').min=startDate;if($('eventEndDate').value<startDate)$('eventEndDate').value=startDate;}
  function autoAdjustEndDate(){
    const sd=$('eventDate').value,ed=$('eventEndDate').value,st=$('eventStart').value,en=$('eventEnd').value;
    if(!sd||!ed||!st||!en)return;
    if(ed===sd&&mins(en)<=mins(st)){$('eventEndDate').value=toISO(addDays(parseISO(sd),1));autoEndDate=true;}
    else if(autoEndDate&&ed===toISO(addDays(parseISO(sd),1))&&mins(en)>mins(st)){$('eventEndDate').value=sd;autoEndDate=false;}
    syncEndDateMin();
  }
  function openEventModal(date,hour,event=null){
    editingId=event?.id||null;autoEndDate=false;$('eventModalTitle').textContent=event?'Изменить дело':'Новое дело';
    const startDate=event?.date||date||toISO(new Date());lastStartDate=startDate;
    const startTime=event?.start||(hour!==undefined?`${pad(hour)}:00`:'09:00');
    const endsNextDay=!event&&hour===23;
    $('eventTitle').value=event?.title||'';$('eventDate').value=startDate;
    $('eventEndDate').value=event?.endDate|| (endsNextDay?toISO(addDays(parseISO(startDate),1)):startDate);
    $('eventCategory').value=event?.categoryId||state.categories[0]?.id||'other';$('eventStart').value=startTime;
    $('eventEnd').value=event?.end||(hour!==undefined?(endsNextDay?'00:00':`${pad(hour+1)}:00`):'10:00');
    $('eventNotes').value=event?.notes||'';syncEndDateMin();$('deleteEventBtn').classList.toggle('hidden',!event);
    $('eventModal').classList.add('open');setTimeout(()=>$('eventTitle').focus(),60);
  }
  function closeModal(id){$(id).classList.remove('open')}
  function validEvent(){
    const title=$('eventTitle').value.trim(),date=$('eventDate').value,endDate=$('eventEndDate').value,start=$('eventStart').value,end=$('eventEnd').value;
    if(!title||!date||!endDate||!start||!end)return 'Заполни название, дни и время.';
    if(endDate<date)return 'Дата окончания не может быть раньше даты начала.';
    if(dateTime(endDate,end)<=dateTime(date,start))return 'Окончание должно быть позже начала. Проверь дату и время.';
    return null;
  }
  $('eventDate').addEventListener('change',()=>{const sd=$('eventDate').value,oldEnd=$('eventEndDate').value;let offset=0;if(lastStartDate&&oldEnd){offset=Math.max(0,Math.round((dayStart(oldEnd).getTime()-dayStart(lastStartDate).getTime())/86400000));}$('eventEndDate').value=toISO(addDays(parseISO(sd),offset));lastStartDate=sd;autoEndDate=false;syncEndDateMin();autoAdjustEndDate();});
  $('eventStart').addEventListener('change',autoAdjustEndDate);
  $('eventEnd').addEventListener('change',autoAdjustEndDate);
  $('eventEndDate').addEventListener('change',()=>{autoEndDate=false;syncEndDateMin();});
  $('eventForm').addEventListener('submit',e=>{
    e.preventDefault();const err=validEvent();if(err){toast(err);return;}
    const previous=editingId?state.events.find(x=>x.id===editingId):null;
    const chosenCategory=$('eventCategory').value,chosenCat=category(chosenCategory);
    const otherBalance=Math.max(0,xpEarnedAll()-(previous?.done?(Number(previous.earnedXP)||0):0)-xpPenaltyAll()+(previous?.failed?(Number(previous.penaltyApplied)||0):0));
    const item={id:editingId||uid(),title:$('eventTitle').value.trim(),date:$('eventDate').value,endDate:$('eventEndDate').value,categoryId:chosenCategory,start:$('eventStart').value,end:$('eventEnd').value,notes:$('eventNotes').value.trim(),done:previous?.done||false,failed:previous?.failed||false,earnedXP:previous?.done&&!NO_XP_CATS.has(chosenCategory)?Math.max(0,Number(chosenCat.xp)||0):0,penaltyXP:previous?.failed&&!NO_XP_CATS.has(chosenCategory)?taskPenalty(chosenCat):0,penaltyApplied:previous?.failed&&!NO_XP_CATS.has(chosenCategory)?Math.min(otherBalance,taskPenalty(chosenCat)):0,completedAt:previous?.done?previous.completedAt||null:null,failedAt:previous?.failed?previous.failedAt||null:null,earnedCoins:previous?.earnedCoins||0,coinsAwarded:!!previous?.coinsAwarded,coinsReversed:!!previous?.coinsReversed};
    if(editingId){const idx=state.events.findIndex(x=>x.id===editingId);if(idx>=0)state.events[idx]=item;}else state.events.push(item);
    const viewedDate=activeMobileDate;const didSave=save();weekStart=mondayOf(parseISO(item.date));activeMobileDate=(viewedDate>=item.date&&viewedDate<=(item.endDate||item.date))?viewedDate:item.date;closeModal('eventModal');render();toast(didSave?(editingId?'Изменения сохранены':'Дело добавлено в расписание'):'Добавлено, но браузер не сохранил данные. Скачай резервную копию.');editingId=null;
  });
  function setTaskStatus(item,nextStatus){
    if(!item)return;
    const current=item.done?'done':item.failed?'failed':'open';
    const target=current===nextStatus?'open':nextStatus;
    const cat=category(item.categoryId);
    if(target==='done'){
      item.done=true;item.failed=false;item.earnedXP=NO_XP_CATS.has(item.categoryId)?0:Math.max(0,Number(cat.xp)||0);item.penaltyXP=0;item.penaltyApplied=0;item.completedAt=toISO(new Date());item.failedAt=null;
      let coins=0;
      if(!item.coinsAwarded){coins=coinRewardForCategory(item.categoryId);item.earnedCoins=coins;item.coinsAwarded=true;item.coinsReversed=false;if(coins){state.economy.coins+=coins;state.economy.ledger.push({type:'task',taskId:item.id,amount:coins,date:toISO(new Date())});}}
      save();render();toast(item.earnedXP?`Отлично! +${item.earnedXP} XP${coins?` · +${coins} монет`:''} · уровень ближе ⚡`:coins?`+${coins} монет! Базовые потребности не дают XP 💜`:'Готово! Базовые потребности важны, XP и монеты за них не начисляются 💜');
    }else if(target==='failed'){
      const revoked=Number(item.earnedXP)||0;
      const coinsRefunded=revokeTaskCoins(item);
      const balanceAfterRevoking=Math.max(0,xpEarnedAll()-xpPenaltyAll()-revoked);
      item.done=false;item.failed=true;item.earnedXP=0;item.completedAt=null;item.penaltyXP=taskPenalty(cat);item.penaltyApplied=Math.min(balanceAfterRevoking,item.penaltyXP);item.failedAt=toISO(new Date());
      const effective=Number(item.penaltyApplied)||0;
      save();render();
      if(item.penaltyXP>0)toast(`Не выполнено · −${effective} XP${coinsRefunded?` · возвращено ${coinsRefunded} монет`:''}. Можно вернуться к плану.`);
      else toast('Отмечено как не выполнено. Базовые потребности не штрафуются 💜');
    }else{
      const removedEarn=Number(item.earnedXP)||0,removedPenalty=Number(item.penaltyApplied)||0,coinsRefunded=revokeTaskCoins(item);
      item.done=false;item.failed=false;item.earnedXP=0;item.penaltyXP=0;item.penaltyApplied=0;item.completedAt=null;item.failedAt=null;
      save();render();toast(removedPenalty?`Возвращено в планы · штраф ${removedPenalty} XP отменён${coinsRefunded?` · возвращено ${coinsRefunded} монет`:''}`:`Возвращено в планы${removedEarn?` · +${removedEarn} XP сняты`:''}${coinsRefunded?` · возвращено ${coinsRefunded} монет`:''}`);
    }
  }
  $('taskList').addEventListener('click',e=>{
    const status=e.target.closest('[data-task-status]');
    if(status){const item=state.events.find(x=>x.id===status.dataset.taskId);setTaskStatus(item,status.dataset.taskStatus);return;}
    const edit=e.target.closest('[data-task-open]');if(edit){const item=state.events.find(x=>x.id===edit.dataset.taskOpen);if(item)openEventModal(item.date,undefined,item);}
  });
  document.querySelectorAll('[data-task-filter]').forEach(b=>b.addEventListener('click',()=>{taskFilter=b.dataset.taskFilter;renderTasks();}));
  $('deleteEventBtn').addEventListener('click',()=>{if(!editingId)return;if(confirm('Удалить это дело из расписания?')){const deleting=state.events.find(e=>e.id===editingId);if(deleting)revokeTaskCoins(deleting);state.events=state.events.filter(e=>e.id!==editingId);save();closeModal('eventModal');render();toast('Дело удалено');editingId=null;}});
  $('addBtn').addEventListener('click',()=>openEventModal(activeMobileDate));
  $('calendarGrid').addEventListener('click',e=>{const eventBtn=e.target.closest('[data-event]');if(eventBtn){const item=state.events.find(x=>x.id===eventBtn.dataset.event);if(item){activeMobileDate=eventBtn.dataset.segmentDate||item.date;openEventModal(item.date,undefined,item);}return;}const slot=e.target.closest('[data-date]');if(slot){openEventModal(slot.dataset.date,Number(slot.dataset.hour));return;}const monthCell=e.target.closest('[data-month-date]');if(monthCell){const iso=monthCell.dataset.monthDate;activeMobileDate=iso;openEventModal(iso);}});
  $('mobileDays').addEventListener('click',e=>{const b=e.target.closest('[data-day]');if(!b)return;activeMobileDate=b.dataset.day;render();});
  function moveCalendarPeriod(direction){if(calendarView==='day'){activeMobileDate=toISO(addDays(parseISO(activeMobileDate),direction));weekStart=mondayOf(parseISO(activeMobileDate));}else if(calendarView==='month'){const d=parseISO(activeMobileDate);d.setDate(1);d.setMonth(d.getMonth()+direction);activeMobileDate=toISO(d);weekStart=mondayOf(d);}else{weekStart=addDays(weekStart,direction*7);activeMobileDate=toISO(weekStart);}render();}
  $('prevWeek').addEventListener('click',()=>moveCalendarPeriod(-1));
  $('nextWeek').addEventListener('click',()=>moveCalendarPeriod(1));
  $('todayBtn').addEventListener('click',()=>{activeMobileDate=toISO(new Date());weekStart=mondayOf(new Date());render()});
  document.querySelectorAll('[data-calendar-view]').forEach(b=>b.addEventListener('click',()=>{calendarView=b.dataset.calendarView;if(calendarView==='week')weekStart=mondayOf(parseISO(activeMobileDate));render();}));
  $('manageCatsBtn').addEventListener('click',()=>{$('categoryModal').classList.add('open');renderCategories()});
  $('addCategoryBtn').addEventListener('click',()=>{const name=$('newCategoryName').value.trim();if(!name){toast('Введи название категории');return;}if(state.categories.some(c=>c.name.toLowerCase()===name.toLowerCase())){toast('Такая категория уже есть');return;}state.categories.push({id:uid(),name,color:$('newCategoryColor').value,xp:0});$('newCategoryName').value='';save();renderCategories();render();toast('Категория добавлена');});
  $('categoryList').addEventListener('change',e=>{
    const colorId=e.target.dataset.color;
    if(colorId){const c=category(colorId);c.color=e.target.value;save();renderCategories();render();return;}
    const xpId=e.target.dataset.xp;
    if(xpId){const c=category(xpId);c.xp=NO_XP_CATS.has(xpId)?0:Math.max(0,Math.min(100,Number(e.target.value)||0));save();renderCategories();render();toast(NO_XP_CATS.has(xpId)?'Для базовых потребностей XP всегда равен 0':`Новая награда: ${c.xp} XP`);}
  });
  $('categoryList').addEventListener('click',e=>{
    const rename=e.target.closest('[data-rename]');if(rename){const c=category(rename.dataset.rename);const n=prompt('Новое название категории:',c.name);if(n&&n.trim()){c.name=n.trim().slice(0,24);save();renderCategories();render();}return;}
    const del=e.target.closest('[data-remove]');if(del){const id=del.dataset.remove;if(!confirm('Удалить категорию? Уже созданные дела останутся в расписании как «Другое».'))return;state.events.forEach(ev=>{if(ev.categoryId===id)ev.categoryId='other'});state.categories=state.categories.filter(c=>c.id!==id);save();renderCategories();render();toast('Категория удалена');}
  });

  $('collectionGrid').addEventListener('click',e=>{
    const info=e.target.closest('[data-character-info]');if(info){showCharacterDetails(info.dataset.characterInfo);return;}
    const select=e.target.closest('[data-character-select]');if(select){chooseCharacter(select.dataset.characterSelect);return;}
  });
  $('activeHeroDetails').addEventListener('click',()=>showCharacterDetails(state.collection.active));
  document.querySelectorAll('[data-collection-filter]').forEach(b=>b.addEventListener('click',()=>{collectionFilter=b.dataset.collectionFilter;renderCollection();}));
  $('characterDetail').addEventListener('click',e=>{const select=e.target.closest('[data-character-select]');if(select)chooseCharacter(select.dataset.characterSelect);});
  $('unlockChooseBtn').addEventListener('click',()=>{if(unlockCharacterId)chooseCharacter(unlockCharacterId);else $('unlockModal').classList.remove('open');});

    $('newQuoteBtn').addEventListener('click',()=>{quoteIndex=(quoteIndex+1)%QUOTES.length;renderQuote();});

  // Economy, cases and transformation controls.
  $('shopPage').addEventListener('click',e=>{
    const tab=e.target.closest('[data-shop-tab]');if(tab){shopTab=tab.dataset.shopTab;renderShop();return;}
    const open=e.target.closest('[data-open-case]');if(open){openCase(open.dataset.openCase);return;}
    const buy=e.target.closest('[data-buy-item]');if(buy){buyMarketItem(buy.dataset.buyItem);return;}
    const equip=e.target.closest('[data-equip-item]');if(equip){equipMarketItem(equip.dataset.equipItem);return;}
    const craft=e.target.closest('[data-craft]');if(craft){craftCard(craft.dataset.craft);return;}
  });
  $('formFilters').addEventListener('click',e=>{const b=e.target.closest('[data-form-filter]');if(!b)return;formFilter=b.dataset.formFilter;document.querySelectorAll('[data-form-filter]').forEach(x=>x.classList.toggle('active',x===b));renderForms();});
  $('formsGrid').addEventListener('click',e=>{const b=e.target.closest('[data-form-select]');if(!b)return;const f=FORM_SKINS.find(x=>x.id===b.dataset.formSelect);if(!f||!state.collection.formsUnlocked.includes(f.id))return;state.collection.active=f.characterId;state.collection.activeForms[f.characterId]=f.id;save();renderCollection();playTransformationEffect();toast(`Форма ${f.name} активирована ⚡`);});
  document.querySelector('[data-base-form]').addEventListener('click',()=>{const active=state.collection.active;delete state.collection.activeForms[active];save();renderCollection();playTransformationEffect();toast('Базовая форма восстановлена');});
  $('skipCaseSpin').addEventListener('click',finishCase);$('closeCaseResult').addEventListener('click',()=>{$('caseModal').classList.remove('open');pendingCaseReward=null;});

  document.querySelectorAll('[data-page]').forEach(b=>b.addEventListener('click',()=>setPage(b.dataset.page)));
  document.querySelectorAll('[data-range]').forEach(b=>b.addEventListener('click',()=>{statsRange=b.dataset.range;document.querySelectorAll('[data-range]').forEach(x=>x.classList.toggle('active',x===b));renderStats();}));
  function saveGoalInput(id,key,max){const value=Math.max(0,Math.min(max,Number($(id).value)||0));state.settings[key]=value;$(id).value=value;save();renderStats();toast('Цель обновлена');}
  $('dailyGoalInput').addEventListener('change',()=>saveGoalInput('dailyGoalInput','dailyGoal',30));
  $('weeklyGoalInput').addEventListener('change',()=>saveGoalInput('weeklyGoalInput','weeklyGoal',100));
  document.querySelectorAll('[data-close]').forEach(b=>b.addEventListener('click',()=>closeModal(b.dataset.close)));
  document.querySelectorAll('.modal-backdrop').forEach(bg=>bg.addEventListener('click',e=>{if(e.target===bg)closeModal(bg.id)}));
  document.addEventListener('keydown',e=>{if(e.key==='Escape')document.querySelectorAll('.modal-backdrop.open').forEach(m=>closeModal(m.id));});
  $('exportBtn').addEventListener('click',()=>{const blob=new Blob([JSON.stringify({...state,appVersion:7},null,2)],{type:'application/json'});const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='fristik-planner-backup.json';a.click();URL.revokeObjectURL(a.href);toast('Резервная копия скачана');});
  $('importBtn').addEventListener('click',()=>$('importFile').click());
  $('importFile').addEventListener('change',async e=>{const f=e.target.files[0];if(!f)return;try{const x=JSON.parse(await f.text());if(!Array.isArray(x.events)||!Array.isArray(x.categories))throw new Error();if(!confirm('Импорт заменит текущее расписание и категории. Продолжить?'))return;state={events:x.events.map(ev=>({...ev,done:!!ev.done,failed:!!ev.failed&&!ev.done,earnedXP:(!ev.done||NO_XP_CATS.has(ev.categoryId))?0:(Number(ev.earnedXP)||0),penaltyXP:(ev.failed&&!NO_XP_CATS.has(ev.categoryId))?(Number(ev.penaltyXP)||taskPenalty({xp:Number(x.categories.find(c=>c.id===ev.categoryId)?.xp)||0})):0,penaltyApplied:ev.failed?Math.max(0,Number(ev.penaltyApplied)||0):0,completedAt:ev.done?(ev.completedAt||null):null,failedAt:ev.failed&&!ev.done?(ev.failedAt||null):null})),categories:DEFAULT_CATS.map(base=>({...base,...(x.categories.find(c=>c.id===base.id)||{}),xp:NO_XP_CATS.has(base.id)?0:Number(x.categories.find(c=>c.id===base.id)?.xp??base.xp)})).concat(x.categories.filter(c=>!DEFAULT_CATS.some(d=>d.id===c.id)).map(c=>({...c,xp:Math.max(0,Number(c.xp??0))}))),settings:{dailyGoal:2,weeklyGoal:10,...(x.settings||{})},collection:{unlocked:Array.isArray(x.collection?.unlocked)?x.collection.unlocked:[],active:x.collection?.active||'goku',initialized:false,...(x.collection||{})}};if(!Array.isArray(state.collection.unlocked))state.collection.unlocked=[];state.collection.initialized=true;state.collection.formsUnlocked=Array.isArray(state.collection.formsUnlocked)?state.collection.formsUnlocked:[];state.collection.activeForms=state.collection.activeForms&&typeof state.collection.activeForms==='object'?state.collection.activeForms:{};state.economy={coins:0,shards:0,ownedCards:{},ownedItems:[],equippedItems:{},totalCasesOpened:0,epicPity:0,ledger:[],...(x.economy||{})};state.economy.coins=Math.max(0,Number(state.economy.coins)||0);state.economy.shards=Math.max(0,Number(state.economy.shards)||0);state.economy.ownedCards=state.economy.ownedCards||{};state.economy.ownedItems=Array.isArray(state.economy.ownedItems)?state.economy.ownedItems:[];state.economy.equippedItems=state.economy.equippedItems||{};state.economy.ledger=Array.isArray(state.economy.ledger)?state.economy.ledger:[];state.notifications={enabled:false,leadMinutes:5,lastNotified:[],...(x.notifications||{})};state.notifications.lastNotified=Array.isArray(state.notifications.lastNotified)?state.notifications.lastNotified:[];state.game={bestScore:0,rewardDate:'',totalPlays:0,lastScore:0,...(x.game||{})};syncCollectionUnlocks(false);syncFormUnlocks(false);save();renderCategories();render();toast('Данные импортированы');}catch(err){toast('Не удалось прочитать файл резервной копии');}e.target.value='';});
  // Reflow the timeline after device rotation or a responsive breakpoint change.
  window.addEventListener('resize',()=>render());
  // Seed a clean category selector and initial schedule.
  if(!state.collection.initialized){syncCollectionUnlocks(false);state.collection.initialized=true;}else{syncCollectionUnlocks(false);}
  syncFormUnlocks(false);renderCategories();renderQuote();render();renderStats();renderCollection();renderShop();updateWalletUI();renderGameInfo();initMiniGame();initNotifications();registerAppServiceWorker();save();document.querySelectorAll('[data-page]').forEach(b=>b.classList.toggle('active',b.dataset.page==='schedule'));
  try { const probe='__ritm_storage_test__';localStorage.setItem(probe,'1');localStorage.removeItem(probe); } catch(err) { const status=$('saveStateText');if(status)status.textContent='Браузер блокирует автосохранение — используй экспорт резервной копии'; }
})();
