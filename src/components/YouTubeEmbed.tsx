import { createElement } from 'react';
import { Platform, View } from 'react-native';
import { WebView } from 'react-native-webview';

// Official YouTube embed player (allowed by YouTube ToS). Branding stays visible.
export function YouTubeEmbed({ videoId, width, height }: { videoId: string; width: number; height: number }) {
  const src = `https://www.youtube-nocookie.com/embed/${videoId}?playsinline=1&rel=0&modestbranding=1`;
  if (Platform.OS === 'web') {
    return (
      <View style={{ width, height, borderRadius: 16, overflow: 'hidden' }}>
        {createElement('iframe', {
          src,
          width,
          height,
          style: { border: 0 },
          allow: 'autoplay; encrypted-media; picture-in-picture',
          allowFullScreen: true,
        })}
      </View>
    );
  }
  return (
    <View style={{ width, height, borderRadius: 16, overflow: 'hidden', backgroundColor: '#000' }}>
      <WebView
        source={{ uri: src }}
        allowsInlineMediaPlayback
        mediaPlaybackRequiresUserAction={false}
        javaScriptEnabled
        style={{ flex: 1 }}
      />
    </View>
  );
}
