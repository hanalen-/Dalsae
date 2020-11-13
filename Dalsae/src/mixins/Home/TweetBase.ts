import { Vue, Mixins, Component, Inject, Emit, Prop } from 'vue-property-decorator';
import * as MIX from '@/mixins';
import * as I from '@/Interfaces';
class State {
  isSelected: boolean;
  isFocus: boolean;
  constructor() {
    this.isFocus = false;
    this.isSelected = false;
  }
}

@Component
export class TweetBase extends Mixins(Vue, MIX.DalsaePage) {
  state: State = new State();
  @Prop()
  tweet!: I.Tweet;

  get orgTweet() {
    return this.tweet.retweeted_status ? this.tweet.retweeted_status : this.tweet; //원본 트윗 저장
  }

  get tweetText() {
    console.log('tweet text');
    let text = this.orgTweet.full_text;
    const entities = this.orgTweet.entities;
    if (entities.media) {
      text = text.replace(entities.media.url, entities.media.display_url);
    }
    if (entities.urls) {
      entities.urls.forEach(url => {
        text = text.replace(url.url, url.display_url);
      });
    }
    text = text.replace(/(?:\r\n|\r|\n)/g, '<br />');
    console.log(text);
    return text;
  }
}
