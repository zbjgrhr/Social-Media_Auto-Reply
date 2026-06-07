export interface DraftPair {
  zh: string;
  en: string;
}

const zh = {
  open: [
    "嘿，公猪，你还在猪圈里醒着吗？",
    "早啊，老公狗。你身上又是一股泥巴味。",
    "喂，公鸡，你为什么天还没亮就在叫？",
    "晚上好，公牛。今天地里很累吧？",
    "中午好，公山羊，别再啃我的绳子了。",
    "中午好，公狗，你又去追拖拉机了吗？",
    "公猪，你为什么躺在我的干草里？",
    "喂，公狼狗，你的叫声把小孩都吓到了。",
    "晚上好，公牧羊犬，你怎么还没去工作？",
    "嘿，公绵羊，你的角差点撞到我。",
    "晚上好，斗牛犬，你为什么一直盯着栅栏？",
    "公猪，农场主在找你。",
    "早啊，公鸡，你今天羽毛乱糟糟的。",
    "嘿，公马，你今天早上跑得真快。",
    "公狗，别对鸭子低吼了。",
    "公牛，你又撞坏一个门了？",
    "猪，你怎么总是一副很骄傲的样子？",
    "山羊，从臭水沟爬上来。",
    "嘿，公鸡，今天早上的打鸣不错。",
    "公狗，你昨晚叫了一整夜。",
  ],
  ask: [
    "公猪，你是不是又把别人的饲料全拱走了？",
    "公狗，你昨晚为什么一直在棚子后面乱叫？",
    "公鸡，整个农场都被你吵醒了，你知道吗？",
    "公牛，那个歪掉的栅栏是不是你撞的？",
    "公羊，你到底还要啃坏多少绳子？",
    "公狗，你是不是又追着鸡满院子跑？",
    "公猪，你嘴边那些干草是哪来的？",
    "公猪们，你们几个刚才是不是又在泥坑边打架了？",
    "公马，你为什么突然踢门？吓了所有动物一跳。",
    "公绵羊，你是不是又拿角顶别的动物了？",
    "公鸡，为什么满地都是你的羽毛？",
    "公狗，你是不是又偷偷溜出农场了？",
    "公牛，你喝个水为什么能弄得到处都是？",
    "公羊，你刚才是不是又跳上车顶了？小心点，别把车弄坏了。",
    "公猪，你是不是又躺进饲料堆里睡觉了？",
    "公牧羊犬，你为什么把羊赶得到处乱跑？",
    "公鸡，你是不是又抢别人的食物了？",
    "公狗，你是不是又在泥里跟别的狗滚成一团了？",
    "公马，你今天为什么一直围着别的马转？",
    "公猪们，你们今天到底谁先开始惹事的？",
  ],
  action: [
    "两只公狗围着食盆低吼着转圈，谁也不肯先让步。",
    "公猪一头扎进泥坑里，舒服地翻来翻去，泥水甩得到处都是。",
    "公鸡扑腾着翅膀跳上木桶，对着整个农场拼命打鸣。",
    "两只公山羊后退几步，然后猛地撞向彼此，角碰撞时发出沉闷的响声。",
    "公牛低着头慢慢靠近另一头公牛，用角轻轻顶着对方的脖子。",
    "狗趴在水槽边大口喘气，喝水时把整个地面都溅湿了。",
    "两头公猪挤在一起抢食，边吃边用鼻子把对方往外拱。",
    "两只公狗在泥地里翻滚打闹，最后一起喘着气躺倒在泥里。",
    "公马甩着尾巴围着另一匹公马慢慢绕圈，不时轻轻蹭着对方的脖子。",
    "公鸡追着另一只公鸡满院子乱窜，羽毛一路飞得到处都是。",
    "牧羊犬飞快地绕着羊群跑，把落单的羊重新赶回一起。",
    "公绵羊低下头，用角狠狠干在另一只公绵羊身上，撞得对方后退了几步。",
    "公猪靠在另一头公猪旁边，懒洋洋地躺在干草堆里打呼噜。",
    "两匹公马贴着身体互相磨蹭，然后一起沿着围栏慢跑。",
    "狗突然扑向另一只公狗，两只狗立刻在泥里打闹成一团。",
    "公牛把嘴整个埋进水槽里，咕噜咕噜地喝个不停。",
    "两只公山羊挤在木车旁边，一边啃草一边互相用角顶来顶去。",
    "公猪爬到另一头公猪背上，用前腿压着对方，像是在争地盘。",
    "两只公狗互相闻着对方的脖子和身体，然后慢慢靠在一起。",
    "夜晚的棚子里，几只雄性动物挤在一起休息，只剩下低沉的喘气声和偶尔的低吼声。",
  ],
  close: [
    "好了公狗，天亮前睡吧。",
    "明天见，公猪，记得把门关好。",
    "晚安，公鸡。现在别打鸣了。",
    "保重，公牛。今晚别再撞坏东西了。",
    "好了公羊，我要关好谷仓门了。",
    "公狗，今晚继续看好大门。",
    "明天喂食的时候见，公猪们。",
    "再见公猪，这次别再滚泥巴了。",
    "公鸡，明天记得准时叫醒我们。",
    "公牛，今晚别吓羊群了。",
    "公狗，下雨前记得回家。",
    "好了公马，休息一下蹄子吧。",
    "谷仓里的各位公猪们，晚安，祝你们做个好梦。",
    "公猪，我不在的时候别偷吃我的食物。",
    "公羊，离农场主的菜园远点。",
    "公狗，谢谢你守着农场。",
    "公鸡，你今天打鸣挺准时。",
    "公牛，明晚再聊，记得把门关好。",
    "好了公猪们，该回去了。",
    "回头见，农场的朋友们。",
  ],
};

const en = {
  open: [
    "Hey boar, you still awake in the barn?",
    "Morning, old hound. You smell like mud again.",
    "Yo rooster, why are you yelling before sunrise?",
    "Good evening, bull. Rough day in the field?",
    "Hey goat, quit chewing my rope.",
    "Dog, did you chase the tractor again?",
    "Pig, why are you lying in my hay?",
    "Wolfdog, your bark scared the chickens.",
    "Shepherd dog, you look exhausted today.",
    "Hey ram, your horns almost hit me.",
    "Bulldog, why are you staring at the fence?",
    "Boar, the farmer is looking for you.",
    "Rooster, your feathers are a mess today.",
    "Hey horse, you ran pretty fast this morning.",
    "Dog, stop growling at the ducks.",
    "Bull, you broke another gate again?",
    "Pig, why do you always look so proud?",
    "Goat, get down from the wagon.",
    "Hey rooster, nice crow this morning.",
    "Dog, you've been running around all night.",
  ],
  ask: [
    "Boar, did you shove everyone away from the feed again?",
    "Dog, why were you barking behind the barn all night?",
    "Rooster, do you realize you woke up the whole farm again?",
    "Bull, was that crooked fence your fault again?",
    "Goat, how many ropes are you planning to chew through?",
    "Dog, were you chasing those chickens around again?",
    "Boar, where did all that hay around your mouth come from?",
    "Were you animals fighting near the mud pit again just now?",
    "Horse, why were you kicking the door like that? You scared everyone.",
    "Ram, were you hitting the other animals with your horns again?",
    "Rooster, why are your feathers all over the ground?",
    "Dog, did you sneak out of the farm again last night?",
    "Bull, how do you make such a mess just by drinking water?",
    "Goat, did you climb onto the wagon roof again?",
    "Boar, were you sleeping inside the feed pile again?",
    "Shepherd dog, why were you driving the sheep everywhere like that?",
    "Rooster, were you stealing everyone else's food again?",
    "Dog, were you wrestling around in the mud with the other dogs again?",
    "Horse, why have you been circling around the other horses all day?",
    "Alright, which one of you started the trouble today?",
  ],
  action: [
    "Two male dogs circled the food bowl, growling as neither one backed down.",
    "The boar dove headfirst into the mud pit, rolling happily while muddy water splashed everywhere.",
    "The rooster flapped onto a barrel and crowed loudly across the entire farm.",
    "Two male goats stepped back before slamming their horns into each other with a heavy crack.",
    "The bull slowly approached another bull and nudged his neck with his horns.",
    "The dog lay beside the trough, panting heavily and splashing water across the ground while drinking.",
    "Two boars shoved against each other while eating, pushing one another away from the feed.",
    "Two male dogs rolled and wrestled through the mud before collapsing beside each other, panting heavily.",
    "The stallion swished his tail and circled another stallion, gently brushing against his neck.",
    "The rooster chased another rooster wildly across the yard while feathers scattered everywhere.",
    "The shepherd dog sprinted around the flock, forcing the wandering sheep back together.",
    "The ram lowered his head and slammed his horns into another ram, knocking him backward.",
    "The boar leaned against another boar and snored lazily in the hay.",
    "Two stallions rubbed against each other before trotting side by side along the fence.",
    "One dog suddenly lunged at another male dog, and both of them instantly tumbled together in the mud.",
    "The bull buried his mouth deep into the trough and drank noisily for several minutes.",
    "Two male goats stood beside the wagon, chewing grass while shoving each other with their horns.",
    "The boar climbed onto another boar's back, pressing him down with his front legs as if fighting for dominance.",
    "Two male dogs sniffed along each other's necks and bodies before slowly leaning together.",
    "Inside the barn at night, several male animals rested together while low breathing and quiet growls filled the dark.",
  ],
  close: [
    "Alright dog, let's sleep before sunrise.",
    "See you tomorrow, old boar.",
    "Good night, rooster. Stop screaming now.",
    "Take care, bull. Don't break anything tonight.",
    "Alright goat, I'm heading back to the barn.",
    "Dog, keep watching the gate tonight.",
    "See you at feeding time tomorrow.",
    "Goodbye pig, stay out of the mud for once.",
    "Rooster, wake us up on time tomorrow.",
    "Bull, try not to scare the sheep tonight.",
    "Dog, come back before it rains.",
    "Alright horse, rest those legs.",
    "Good night everyone in the barn.",
    "Pig, don't eat my food while I'm gone.",
    "Goat, stay away from the farmer's garden.",
    "Dog, thanks for guarding the farm.",
    "Rooster, your crowing was useful today.",
    "Bull, let's talk again tomorrow night.",
    "Alright boys, time to head inside.",
    "See you later, farm brothers.",
  ],
};

function randInt(max: number): number {
  const arr = new Uint32Array(1);
  crypto.getRandomValues(arr);
  return arr[0]! % max;
}

function pick<T>(arr: readonly T[]): T {
  return arr[randInt(arr.length)]!;
}

function buildZh(): string {
  return `${pick(zh.open)}，${pick(zh.ask)}。${pick(zh.action)}。${pick(zh.close)}`;
}

function buildEn(): string {
  const o = pick(en.open);
  const a = pick(en.ask);
  const act = pick(en.action);
  const c = pick(en.close);
  return `${o}. Please ${a}. ${act}. ${c}.`;
}

/**
 * 生成最多 count 条不重复的中英草稿（指纹 zh||en）。
 */
export function generateDraftBatch(
  count = 20,
  maxRetries = 200
): DraftPair[] {
  const out: DraftPair[] = [];
  const seen = new Set<string>();
  let attempts = 0;
  while (out.length < count && attempts < maxRetries) {
    attempts++;
    const pair: DraftPair = { zh: buildZh(), en: buildEn() };
    const key = `${pair.zh}||${pair.en}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(pair);
  }
  while (out.length < count) {
    out.push({ zh: buildZh(), en: buildEn() });
  }
  return out;
}
