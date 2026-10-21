import { createElement, useEffect, useRef, useState, type ComponentType, type Ref } from 'react';
import { Platform, View, type StyleProp, type ViewStyle } from 'react-native';
import { WebView, type WebViewProps } from 'react-native-webview';

// react-native-webview's class typings clash with React 19's ref types; narrow them once here.
type WebViewHandle = { injectJavaScript: (script: string) => void };
const WV = WebView as unknown as ComponentType<WebViewProps & { ref?: Ref<WebViewHandle> }>;

/**
 * YouTube player built on the official IFrame API.
 *
 * Why an HTML wrapper: YouTube now refuses embeds that arrive without an identifying
 * Referer ("Error 153"). Loading the player from a small page with a baseUrl gives it one.
 */
const ORIGIN = 'https://selah.app';

type Props = {
  videoIds: string[]; // first plays, the rest follow as a playlist
  width: number;
  height: number;
  /** Controlled playback (used by background music). Omit for a normal user-controlled player. */
  playing?: boolean;
  muted?: boolean;
  volume?: number; // 0–100
  showControls?: boolean;
  style?: StyleProp<ViewStyle>;
};

function playerHtml(ids: string[], opts: { autoplay: boolean; controls: boolean; volume: number }) {
  const [first, ...rest] = ids;
  const playlist = [...rest, first].join(',');
  return `<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="referrer" content="strict-origin-when-cross-origin">
<style>html,body{margin:0;padding:0;background:#000;height:100%;overflow:hidden}#p{width:100%;height:100%}</style></head>
<body><div id="p"></div>
<script src="https://www.youtube.com/iframe_api"></script>
<script>
var player, wantPlay = ${opts.autoplay};
function onYouTubeIframeAPIReady(){
  player = new YT.Player('p', {
    width:'100%', height:'100%', videoId:'${first}', host:'https://www.youtube-nocookie.com',
    playerVars:{ autoplay:${opts.autoplay ? 1 : 0}, playsinline:1, controls:${opts.controls ? 1 : 0}, rel:0, loop:1,
      playlist:'${playlist}', origin:'${ORIGIN}', widget_referrer:'${ORIGIN}' },
    events:{
      onReady:function(e){ e.target.setVolume(${opts.volume}); if(wantPlay){ e.target.playVideo(); } },
      onError:function(){ try{ player.nextVideo(); }catch(_){} }
    }
  });
}
window.selah = {
  play:function(){ wantPlay=true; if(player&&player.playVideo){player.playVideo();} },
  pause:function(){ wantPlay=false; if(player&&player.pauseVideo){player.pauseVideo();} },
  mute:function(m){ if(player&&player.mute){ m?player.mute():player.unMute(); } },
  volume:function(v){ if(player&&player.setVolume){player.setVolume(v);} }
};
</script></body></html>`;
}

export function YouTubeEmbed({ videoIds, width, height, playing, muted = false, volume = 100, showControls = true, style }: Props) {
  const ref = useRef<WebViewHandle>(null);
  const controlled = playing !== undefined;
  const [html] = useState(() => playerHtml(videoIds, { autoplay: !!playing, controls: showControls, volume }));

  useEffect(() => {
    if (!controlled) return;
    ref.current?.injectJavaScript(`window.selah && window.selah.${playing ? 'play' : 'pause'}(); true;`);
  }, [playing, controlled]);
  useEffect(() => {
    ref.current?.injectJavaScript(`window.selah && window.selah.mute(${muted}); true;`);
  }, [muted]);

  if (Platform.OS === 'web') {
    const src = `https://www.youtube-nocookie.com/embed/${videoIds[0]}?playsinline=1&rel=0&autoplay=${playing ? 1 : 0}&mute=${muted ? 1 : 0}&loop=1&playlist=${videoIds.join(',')}`;
    return (
      <View style={[{ width, height, overflow: 'hidden' }, style]}>
        {createElement('iframe', {
          src,
          width,
          height,
          style: { border: 0 },
          allow: 'autoplay; encrypted-media; picture-in-picture',
          referrerPolicy: 'strict-origin-when-cross-origin',
          allowFullScreen: true,
        })}
      </View>
    );
  }

  return (
    <View style={[{ width, height, overflow: 'hidden', backgroundColor: '#000' }, style]}>
      <WV
        ref={ref}
        source={{ html, baseUrl: ORIGIN }}
        originWhitelist={['*']}
        allowsInlineMediaPlayback
        mediaPlaybackRequiresUserAction={false}
        javaScriptEnabled
        domStorageEnabled
        scrollEnabled={false}
        style={{ flex: 1, backgroundColor: '#000' }}
      />
    </View>
  );
}
