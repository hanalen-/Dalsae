<template>
  <div :class="imgClass">
    <v-badge :value="user.verified" avatar bottom overlap color="white" offset-x="20" offset-y="20">
      <template v-slot:badge>
        <v-icon style="font-size:18px; color:#1da1f2">mdi-check-decagram</v-icon>
      </template>
      <v-avatar rounded :size="maxWidth">
        <v-img :src="img">
          <template v-slot:placeholder>
            <v-row class="fill-height ma-0" align="center" justify="center">
              <v-progress-circular indeterminate color="grey lighten-5"></v-progress-circular>
            </v-row>
          </template>
        </v-img>
        <!-- <img ref="refImg" :src="img" :class="imgClass" /> -->
      </v-avatar>
    </v-badge>
  </div>
</template>

<style lang="scss" scoped>
.propic {
  // margin-left: 4px;
  object-fit: contain;
  border-radius: 12px;
  margin-bottom: auto;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.12), 0 1px 2px rgba(0, 0, 0, 0.24);
}
.empty {
  display: none !important;
}
.big {
  width: 73px;
}
.normal {
  width: 48px;
}
.v-badge__badge:after {
  transform: none !important;
}
</style>

<script lang="ts">
import { DalsaeApp, DalsaePage, TweetBase } from '@/mixins';
import { Vue, Mixins, Component, Ref, Provide, Inject, Prop } from 'vue-property-decorator';
import * as I from '@/Interfaces';
import store from '@/store';

@Component
export default class Propic extends Mixins(DalsaePage) {
  @Prop()
  user!: I.User;
  uiOption!: I.UIOption;
  async created() {
    this.uiOption = store.state.option.uiOption;
  }

  get maxWidth() {
    return this.uiOption.isBigPropic ? 73 : 48;
  }

  get img() {
    return this.uiOption.isBigPropic
      ? this.user.profile_image_url_https.replace('_normal', '_bigger')
      : this.user.profile_image_url_https;
  }

  get imgClass() {
    if (!this.uiOption.isShowPropic) return 'empty';
    else if (this.uiOption.isBigPropic) return 'big';
    else return 'normal';
  }
}
</script>
