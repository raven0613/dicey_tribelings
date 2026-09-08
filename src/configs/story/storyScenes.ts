import type { StoryId, StoryScene } from '../../types/story';

export const STORY_SCENES: Record<StoryId, StoryScene> = {
  intro: {
    title: '骰骰土人', cinematic: true,
    lines: [
      { speaker: 'tribeling', text: '鱷魚人又來了！以前明明大家講好土河鱷界各過各的⋯⋯' },
      { speaker: 'tribeling', text: '可是他們最近老是跑出沼澤鬧事！' },
      { speaker: 'tribeling', text: '以前都是王子大人帶我們把他們打跑的' },
      { speaker: 'tribeling', text: '但是他⋯⋯他這次親自去沼澤底下找鱷魚人首領談判，就再也沒回來了啦😭' },
      { speaker: 'tribeling', text: '一定是鱷魚人的沼澤太髒了他看不清回來的路，我們必須去把他救出來！' },
      { speaker: 'player', text: '⋯⋯但是他都看不到路了你們能看到？' },
      { speaker: 'tribeling', text: '當然能！為了這一天我們早就開發了有強力探照燈的土人潛水艇！' },
      { speaker: 'player', text: '既然早就開發好了為什麼沒有趕快去救人？' },
      { speaker: 'tribeling', text: '我們要選賢舉能！' },
      { speaker: 'player', text: '你們選賢舉能就是叫一個第一次見面的人替你們去送是嗎？！', shape: 'spiky' },
      { speaker: 'tribeling', text: '我們會跟著你一起去的嘛🥺' },
      { speaker: 'player', text: '⋯⋯' },
      { speaker: 'tribeling', text: '出發！出發！出發！', shape: 'spiky' },
    ],
  },
  battle: {
    title: '開始救援',
    lines: [
      { speaker: 'tribeling', text: '是鱷魚人！', shape: 'spiky' },
      { speaker: 'tribeling', text: '來吧，儘管命令我們，代理王子大人！', shape: 'spiky' },
    ],
  },
  control: {
    title: '戰術性撤退', anchor: 'control',
    lines: [
      { speaker: 'tribeling', text: '骰得不滿意就點他叫他重來一次，這個叫戰術性撤退啦！' },
      { speaker: 'tribeling', text: '不過一場戰鬥只能撤退 3 次喔！' },
    ],
  },
  chest: {
    title: '補給寶箱', automatic: true,
    lines: [
      { speaker: 'tribeling', text: '是寶箱！快看看！' },
      { speaker: 'tribeling', text: '快看看！', retainPrevious: true },
      { speaker: 'tribeling', text: '趁鱷魚人沒發現快拿一個走！' },
    ],
  },
  temporary: {
    title: '一場戰鬥的幫手',
    lines: [
      { speaker: 'tribeling', text: '臨時貼紙就是⋯⋯有些人很忙只能來幫忙一場戰鬥啦！' },
      { speaker: 'tribeling', text: '真的很忙！', retainPrevious: true },
      { speaker: 'tribeling', text: '開戰前把他貼到想換的骰面上，這場打完原本的人就會回來啦！' },
    ],
  },
  princess: {
    title: '小公主加入',
    lines: [
      { speaker: 'princess', text: '請等一下～～！我也要跟你們去抓鱷魚！' },
      { speaker: 'tribeling', text: '快假裝沒看見！要是把她弄丟長老大人會生氣的！', shape: 'spiky' },
      { speaker: 'tribeling', text: '超生氣！', shape: 'spiky', retainPrevious: true },
      { speaker: 'princess', text: '來不及了！我已經把自己貼在潛水艇上了！' },
      { speaker: 'narrator', text: '得到土人小公主 ×1' },
      { speaker: 'player', text: '⋯⋯' },
    ],
  },
  ending: {
    title: '一天王子的生活', cinematic: true,
    lines: [
      { speaker: 'narrator', text: '鱷魚人的地城藏在沼澤水底，王子被關在最深處的深牢。擊敗鱷魚王後，土人隊伍救回王子。' },
      { speaker: 'prince', text: '我身為王子，能夠帶領大家才是真本事，有沒有戴王冠根本沒差啦。' },
      { speaker: 'prince', text: '這個就送給你當謝禮吧，代理王子！' },
      { speaker: 'prince', text: '王子把王冠送給你。', illustration: 'crownGift' },
      { speaker: 'player', text: '你接過王冠捧在手裡。', illustration: 'crownHeld' },
      { speaker: 'narrator', text: '得到了土人王子的王冠' },
      { speaker: 'player', text: '就這樣，我體驗了一天王子的生活，除了吃喝玩樂以外的都體驗到了，又回歸平民' },
      { speaker: 'narrator', text: '一周目結束' },
      { speaker: 'narrator', text: '門外傳來暴力的敲門聲：咚咚咚！砰！砰！' },
      { speaker: 'crocodile', text: '開門！給我開門！你們這群只會動粗的土人！', shape: 'spiky' },
      { speaker: 'tribeling', text: '怎麼是你！你沒看到鱷魚人與爛水草請勿進入嗎？' },
      { speaker: 'crocodile', text: '你們以為我想嗎？多虧你們把地牢拆得稀巴爛，把地底的怪物全吵醒了' },
      { speaker: 'crocodile', text: '還不快來幫忙！等那些東西爬上來，大家一起完蛋！' },
      { speaker: 'tribeling', text: '隨便把王子大人關在那種地方，完全是你們的問題吧！' },
      { speaker: 'prince', text: '這次也可以拜託你嗎？我也會一起去的！' },
      { speaker: 'princess', text: '還有我！我也要去！' },
      { speaker: 'player', text: '那這次總不用我當王子了吧？' },
      { speaker: 'tribeling', text: '代理王子大人！出發！出發！', shape: 'spiky' },
      { speaker: 'player', text: '為什麼王子本人在還需要代理啊？！', shape: 'spiky' },
      { speaker: 'prince', text: '我不介意啊' },
      { speaker: 'narrator', text: '得到土人王子 ×1' },
    ],
  },
};
