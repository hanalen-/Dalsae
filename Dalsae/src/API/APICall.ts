/* eslint-disable @typescript-eslint/camelcase */
import * as P from '@/Interfaces';
import * as I from '@/Interfaces';
import * as M from '@/Managers';

const baseUrl = 'https://api.twitter.com/1.1';

function CreateOptions(
  method: P.Method,
  body: string | FormData,
  authorization: string,
  contentType?: string
) {
  const options: RequestInit = {
    headers: {
      'Content-Type': contentType
        ? contentType
        : 'application/x-www-form-urlencoded;encoding=utf-8',
      Authorization: authorization
    },
    body: body ? body : null,
    method
  };
  return options;
}

export default class TwitterAPI {
  mngAccount!: M.AccountManager;
  async request<TReq, TResp>(
    url: string,
    method: P.Method,
    params?: P.APIReq<TReq>
  ): Promise<P.APIResp<TResp>> {
    try {
      const oauth: I.OAuth = new I.OAuth();
      oauth.SetKey(this.mngAccount.publicKey, this.mngAccount.secretKey);

      const body = params && params.data ? oauth.CreateBody(params) : '';
      const reqUrl = oauth.GetUrl(params, method, url);
      const options = CreateOptions(method, body, oauth.GetHeader(params, method, url));
      console.log('-------');
      console.log(params);
      console.log(options);
      const resp = await fetch(reqUrl, options);
      console.log(resp);
      if (!resp.ok) {
        throw new Error(resp.statusText);
      } else {
        const json = await resp.json();
        console.log(json);
        return { data: json };
      }
    } catch (e) {
      console.log('catch');
      console.log(e);
      return e;
    }
  }

  async requestOAuth<TReq>(url: string, params?: P.APIReq<TReq>): Promise<P.APIResp<P.OAuthRes>> {
    try {
      const oauth: I.OAuth = new I.OAuth();
      oauth.SetKey(
        this.mngAccount.tempUser.oauth_token,
        this.mngAccount.tempUser.oauth_token_secret
      );

      const body = params && params.data ? oauth.CreateBody(params) : '';
      const reqUrl = oauth.GetUrl(params, 'POST', url);
      const options = CreateOptions('POST', body, oauth.GetHeader(params, 'POST', url));
      console.log(options);
      const resp = await fetch(reqUrl, options);
      if (!resp.ok) {
        throw new Error(resp.statusText);
      } else {
        const body = await resp.text();
        console.log(body);

        const pro = new Promise<P.APIResp<P.OAuthRes>>(resolve => {
          const arr = body.split('&').map(x => x.split('='));
          const oauth: I.OAuthRes = {
            oauth_callback_confirmed: false,
            oauth_token: '',
            oauth_token_secret: '',
            name: '',
            user_id: '',
            screen_name: ''
          };
          const resp: P.APIResp<P.OAuthRes> = { data: oauth };
          arr.forEach(item => {
            console.log(item);
            if (item[0] === 'oauth_callback_confirmed') {
              oauth.oauth_callback_confirmed = item[1] === 'true';
            } else if (item[0] === 'oauth_token') {
              oauth.oauth_token = item[1];
            } else if (item[0] === 'oauth_token_secret') {
              oauth.oauth_token_secret = item[1];
            } else if (item[0] === 'screen_name') {
              oauth.screen_name = item[1];
            } else if (item[0] === 'name') {
              oauth.name = item[1];
            } else if (item[0] === 'user_id') {
              oauth.user_id = item[1];
            }
          });
          resp.data = oauth;
          resolve(resp);
        });
        return pro;
      }
    } catch (e) {
      console.log('catch');
      console.log(e);
      return e;
    }
  }

  async media<TResp>(
    url: string,
    method: P.Method,
    params: P.APIReq<P.ReqMedia>
  ): Promise<P.APIResp<TResp>> {
    try {
      const oauth: I.OAuth = new I.OAuth();
      oauth.SetKey(this.mngAccount.publicKey, this.mngAccount.secretKey);

      const body = new FormData();
      if (params.data) {
        const media = params.data?.media.split(',')[1]; //data:image/png;base64, 이거 잘라야함
        console.log(media);
        body.append('media_data', media);
      }
      const reqUrl = oauth.GetUrl(undefined, method, url);
      console.log('header~!');
      console.log(oauth.GetHeader(undefined, method, url));
      const options = CreateOptions(
        method,
        body,
        oauth.GetHeader(undefined, method, url),
        'multipart/form-data'
      );
      console.log('-------');
      console.log(body);
      console.log(options);
      const resp = await fetch(reqUrl, options);
      console.log(resp);
      if (!resp.ok) {
        console.log('media error!');
        throw new Error(resp.statusText);
      } else {
        console.log('media ok!');
        console.log(resp);
        const json = await resp.json();
        console.log(json);
        return { data: json };
      }
    } catch (e) {
      console.log('catch');
      console.log(e);
      return e;
    }
  }

  async get<TReq, TResp>(url: string, params: P.APIReq<TReq>) {
    return this.request<TReq, TResp>(url, 'GET', params);
  }

  async post<TReq, TResp>(url: string, params: P.APIReq<TReq>) {
    return this.request<TReq, TResp>(url, 'POST', params);
  }

  get call() {
    return {
      account: {
        VerifyCredentials: () =>
          this.get<P.ReqUserInfo, I.User>(baseUrl + '/account/verify_credentials.json', {})
      },
      media: {
        Upload: (data: P.ReqMedia) => {
          const ret = this.media<P.MediaResp>(
            'https://upload.twitter.com/1.1/media/upload.json',
            'POST',
            { data: data }
          );
          return ret;
        }
      },
      statuses: {
        Update: (data: P.ReqUpdate) =>
          this.post<P.ReqUpdate, I.Tweet>(baseUrl + '/statuses/update.json', {
            data
          }),
        TimeLine: (data: P.ReqTimeLine) =>
          this.get<P.ReqTimeLine, I.Tweet[]>(baseUrl + '/statuses/home_timeline.json', {
            data
          }),
        Mention: (data: P.ReqTimeLine) =>
          this.get<P.ReqMention, I.Tweet[]>(baseUrl + '/statuses/mentions_timeline.json', {
            data
          })
      },
      oauth: {
        ReqToken: (data: P.ReqToken) =>
          this.requestOAuth<P.ReqToken>('https://api.twitter.com/oauth/request_token', {
            data
          }),
        ReqAccessToken: (data: P.ReqAccessToken) =>
          this.requestOAuth<P.ReqAccessToken>('https://api.twitter.com/oauth/access_token', {
            data
          })
      }
    };
  }
}
