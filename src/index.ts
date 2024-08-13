import { Context, Time, segment, Schema, Quester } from 'koishi'
import emojiStr from '../data.json'


export const name = 'maple-emojimix'

export interface Config {
  emojiEndpoint?: string;
  mixDataEndpoint?: string;
  quester: Quester.Config;
}

export const Config: Schema<Config> = Schema.object({
  emojiEndpoint: Schema.string().default('https://www.gstatic.com/android/keyboard/emojikitchen/'),
  mixDataEndpoint: Schema.string().default('https://github.com/univeous/koishi-plugin-emojimix/raw/master/data.json').description('emoji 混合数据的 endpoint 。'),
  quester: Quester.Config,
})

function getCodePoint(emoji: string) {
  return Array.from(emoji)
    .map(char => char.codePointAt(0).toString(16))
    .map(hex => 'u' + hex)
    .join('-')
}

function splitEmojis(text) {
  // 匹配所有可能的Emoji字符，包括由零宽连接符（ZWJ）连接的复合Emoji
  const emojiArray = text.match(/([\uD800-\uDBFF][\uDC00-\uDFFF]|[\u2600-\u27BF]|\uFE0F|\u200D|\u20E3|\u0023\uFE0F\u20E3|\u00A9|\u00AE|\u2122|\u23CF|\u24C2|[\u1F3FB-\u1F3FF]|\u1F004|\u1F0CF|\u1F170-\u1F251|\u1F300-\u1F5FF|\u1F600-\u1F64F|\u1F680-\u1F6FF|\u1F7E0-\u1F7EB|\u1F910-\u1F93E|\u1F9C0-\u1F9C2|\u1F9D0-\u1F9D9|\u1F9E0-\u1F9FF|\u1FA70-\u1FA7C|\u1FA90-\u1FA95|\u231A-\u231B|\u2328|\u23CF|\u23E9-\u23F3|\u23F8-\u23FA|\u24C2|\u25AA-\u25AB|\u25B6|\u25C0|\u25FB-\u25FE|\u2600-\u26FF|\u2702-\u27B0|\u2934-\u2935|\u2B05-\u2B07|\u2B1B-\u2B1C|\u2B50|\u2B55|\u3030|\u303D|\u3297|\u3299])/g);
  return emojiArray || [];
}

export async function apply(context: Context, config: Config) {
  const ctx = context.isolate('http')
  ctx.http = context.http.extend(config.quester)
  const emojis = JSON.parse(JSON.stringify(emojiStr))[0];
  ctx.on('message', async (session) => {
    const userMessage = session.content;
    const originEmoji = splitEmojis(userMessage);
    let [e1, e2] = originEmoji
    if (!e1 || !e2) return
    let emoji1;
    let codePoint1;
    let codePoint2;
    let date;
    let url;
    let first_try = true;

    while (true) {
      try {
        if (e1)
          codePoint1 = getCodePoint(e1);
        else
          codePoint1 = Object.keys(emojis)[Math.floor(Math.random() * Object.keys(emojis).length)];
        emoji1 = emojis[codePoint1];
        emoji1 = emoji1.reduce((acc, cur) => {
          let key = Object.keys(cur)[0];
          acc[key] = cur[key];
          return acc;
        });
        if (e2)
          codePoint2 = getCodePoint(e2);
        else
          codePoint2 = Object.keys(emoji1)[Math.floor(Math.random() * Object.keys(emoji1).length)];
        date = emoji1[codePoint2];
        url = `${config.emojiEndpoint}${date}/${codePoint1}/${codePoint1}_${codePoint2}.png`;
        await ctx.http.get(url);
        break;
      }
      catch (error) {
        if (e1 && e2) {
          if (first_try) {
            [e1, e2] = [e2, e1];
            first_try = false;
            continue;
          }
          return '不存在对应的emojimix。';
        }
        else
          break;
      }
    }
    session.send(segment("image", { url: url }))

  })
}
