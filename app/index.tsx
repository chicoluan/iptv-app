'use client'

import { useEvent } from 'expo'
import { useVideoPlayer, VideoView } from 'expo-video'
import { useEffect, useState } from 'react'
import {
  Button,
  FlatList,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native'

type Channel = {
  channel: string
  title: string
  url: string
  quality?: string
}

type ChannelWithLanguage = Channel & {
  languages: string[]
}

type Language = {
  name: string
  code: string
}

export default function Index() {
  const [channels, setChannels] = useState<Channel[]>([])
  const [currentUrl, setCurrentUrl] = useState<string | null>(null)
  const [search, setSearch] = useState('')

  const filteredChannels = channels.filter((c) =>
    c.title.toLowerCase().includes(search.toLowerCase()),
  )

  useEffect(() => {
    async function loadChannels() {
      try {
        const [streamsRes, channelsRes, languagesRes] = await Promise.all([
          fetch('https://iptv-org.github.io/api/streams.json'),
          fetch('https://iptv-org.github.io/api/channels.json'),
          fetch('https://iptv-org.github.io/api/languages.json'),
        ])
        const streams = await streamsRes.json()
        const channelsData = await channelsRes.json()
        const languagesData: Language[] = await languagesRes.json()
        const languageMap = languagesData.reduce<Record<string, string>>(
          (acc, lang) => {
            acc[lang.code] = lang.name
            return acc
          },
          {},
        )

        // biome-ignore lint/suspicious/noExplicitAny: <explanation>
        const channelsById: Record<string, any> = {}
        // biome-ignore lint/complexity/noForEach: <explanation>
        // biome-ignore lint/suspicious/noExplicitAny: <explanation>
        // biome-ignore lint/suspicious/noAssignInExpressions: <explanation>
        channelsData.forEach((c: any) => (channelsById[c.id] = c))

        // Merge stream info with channel info
        const onlineStreams: ChannelWithLanguage[] = streams
          // Filter for online streams and channels that exist
          // biome-ignore lint/suspicious/noExplicitAny: <explanation>
          .filter((s: any) => s.status !== 'offline' && s.channel)
          // biome-ignore lint/suspicious/noExplicitAny: <explanation>
          .map((s: any) => {
            const channelInfo = channelsById[s.channel]
            const languageCodes: string[] = channelInfo?.languages || []
            const languageNames = languageCodes.map(
              (code) => languageMap[code] || code,
            )

            return {
              ...s,
              title: channelInfo?.name || s.channel,
              languages: languageNames,
            }
          })

        setChannels(onlineStreams)
      } catch (err) {
        console.error(err)
      }
    }

    loadChannels()
  }, [])

  const player = useVideoPlayer(currentUrl || '', (player) => {
    player.loop = true
    player.play()
  })

  const { isPlaying } = useEvent(player, 'playingChange', {
    isPlaying: player.playing,
  })
  return (
    <>
      {currentUrl && (
        <View style={styles.playerWrapper}>
          <VideoView
            style={styles.video}
            player={player}
            allowsFullscreen
            allowsPictureInPicture
          />
          <View style={styles.controlsContainer}>
            <Button
              title={isPlaying ? 'Pause' : 'Play'}
              onPress={() => (isPlaying ? player.pause() : player.play())}
            />
          </View>
        </View>
      )}

      <TextInput
        placeholder='Search channel...'
        style={styles.searchInput}
        value={search}
        onChangeText={setSearch}
      />

      <FlatList
        data={filteredChannels}
        keyExtractor={(item) => item.title + item.url}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.channelItem}
            onPress={() => setCurrentUrl(item.url)}
          >
            <Text>
              {item.title} ({item.quality || '?'})
            </Text>
          </TouchableOpacity>
        )}
      />
    </>
  )
}

const styles = StyleSheet.create({
  searchInput: {
    padding: 10,
    borderColor: '#ccc',
    borderWidth: 1,
    borderRadius: 8,
    marginBottom: 10,
  },
  playerWrapper: { marginBottom: 20 },
  video: { width: '100%', height: 250, backgroundColor: '#000' },
  controlsContainer: { padding: 10, alignItems: 'center' },
  channelItem: {
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#ccc',
  },
})
