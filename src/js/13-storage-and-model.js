const KEY='radar-innowacji-v9';
const uid=()=>'i'+Math.random().toString(36).slice(2,9);
const now=()=>new Date().toLocaleDateString('pl-PL');
function mk(o){return Object.assign({id:uid(),type:'technologiczna',instType:0,institution:'',city:'',creators:'',contact:'',phone:'',title:'',problem:'',description:'',tags:[],stage:1,scope:2,infra:2,team:1,ip:0,hasDocs:false,status:0,contacts:[],log:[{t:now(),x:'Zgłoszono do radaru'}],scores:null,ai:null,rodzaj:-1,novelty:-1,origin:-1,cats:[],benefit:'',owner:'',public:true,interests:[],source:'Zgłoszenie ręczne'},o)}
function demoData(){return REAL_ITEMS.map(x=>JSON.parse(JSON.stringify(x)))}
const FEED=[];

