"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { playClickSound, playDoubleClickSound } from "@/app/utils/sounds";

// Declare YouTube IFrame API types
declare global {
  interface Window {
    YT: {
      Player: new (elementId: string, config: YouTubePlayerConfig) => YouTubePlayer;
      PlayerState: {
        PLAYING: number;
        PAUSED: number;
        ENDED: number;
      };
    };
    onYouTubeIframeAPIReady: () => void;
  }
}

interface YouTubePlayerConfig {
  height: string;
  width: string;
  videoId: string;
  playerVars?: {
    autoplay?: number;
    controls?: number;
    loop?: number;
    playlist?: string;
  };
  events?: {
    onReady?: (event: { target: YouTubePlayer }) => void;
    onStateChange?: (event: { data: number }) => void;
  };
}

interface YouTubePlayer {
  playVideo: () => void;
  pauseVideo: () => void;
  setVolume: (volume: number) => void;
  destroy: () => void;
  getPlayerState: () => number;
}

// Music genres and their tracks
type MusicGenre = "chill" | "jazz" | "burmese-lofi";

const MUSIC_PLAYLISTS: Record<MusicGenre, string[]> = {
  chill: [
    "chill_1.mp3",
    "chill_2.mp3",
    "chill_3.mp3",
  ],
  jazz: [
    "pogicity_music_001.mp3",
    "pogicity_music_002.mp3",
    "pogicity_music_003.mp3",
    "pogicity_music_004.mp3",
    "pogicity_music_005.mp3",
    "pogicity_music_006.mp3",
    "pogicity_music_007.mp3",
  ],
  "burmese-lofi": [], // YouTube-based, no local tracks
};

// YouTube video ID for Burmese Lofi
const YOUTUBE_VIDEO_ID = "QBU1VVd9qO4";

// Gray color scheme for music player
const GRAY_COLORS = {
  bg: "#5a5a5a",
  bgActive: "#3a3a3a",
  borderLight: "#7a7a7a",
  borderDark: "#3a3a3a",
  shadow: "#2a2a2a",
};

// Music player component styled like top menu buttons
export default function MusicPlayer() {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentGenre, setCurrentGenre] = useState<MusicGenre>("chill");
  const [currentTrack, setCurrentTrack] = useState(0);
  const [ytReady, setYtReady] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const ytPlayerRef = useRef<YouTubePlayer | null>(null);
  const ytContainerRef = useRef<HTMLDivElement | null>(null);

  const currentPlaylist = MUSIC_PLAYLISTS[currentGenre];
  const getTrackPath = (genre: MusicGenre, index: number) =>
    `/audio/music/${genre}/${MUSIC_PLAYLISTS[genre][index]}`;

  const nextTrack = () => {
    if (currentGenre === "burmese-lofi") return; // No tracks for YouTube
    setCurrentTrack((prev) => (prev + 1) % currentPlaylist.length);
    playClickSound();
  };

  const prevTrack = () => {
    if (currentGenre === "burmese-lofi") return; // No tracks for YouTube
    setCurrentTrack((prev) => (prev - 1 + currentPlaylist.length) % currentPlaylist.length);
    playClickSound();
  };

  const togglePlay = useCallback(() => {
    if (currentGenre === "burmese-lofi") {
      // Toggle YouTube player
      if (ytPlayerRef.current && ytReady && typeof ytPlayerRef.current.playVideo === "function") {
        if (isPlaying) {
          ytPlayerRef.current.pauseVideo();
        } else {
          ytPlayerRef.current.playVideo();
        }
        setIsPlaying(!isPlaying);
      }
    } else {
      // Toggle local audio
      if (!audioRef.current) return;
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play().catch(() => { });
      }
      setIsPlaying(!isPlaying);
    }
    playClickSound();
  }, [currentGenre, isPlaying, ytReady]);

  // Initialize YouTube IFrame API
  useEffect(() => {
    if (typeof window !== "undefined" && !window.YT) {
      const tag = document.createElement("script");
      tag.src = "https://www.youtube.com/iframe_api";
      const firstScriptTag = document.getElementsByTagName("script")[0];
      firstScriptTag.parentNode?.insertBefore(tag, firstScriptTag);

      window.onYouTubeIframeAPIReady = () => {
        setYtReady(true);
      };
    } else if (window.YT) {
      setYtReady(true);
    }
  }, []);

  // Create YouTube player when API is ready and genre is burmese-lofi
  useEffect(() => {
    if (ytReady && currentGenre === "burmese-lofi" && !ytPlayerRef.current) {
      ytPlayerRef.current = new window.YT.Player("youtube-player", {
        height: "1",
        width: "1",
        videoId: YOUTUBE_VIDEO_ID,
        playerVars: {
          autoplay: 0,
          controls: 0,
          loop: 1,
          playlist: YOUTUBE_VIDEO_ID, // Required for loop
        },
        events: {
          onReady: (event) => {
            event.target.setVolume(30); // 30% volume
          },
          onStateChange: (event) => {
            if (event.data === window.YT.PlayerState.PLAYING) {
              setIsPlaying(true);
            } else if (event.data === window.YT.PlayerState.PAUSED) {
              setIsPlaying(false);
            }
          },
        },
      });
    }
  }, [ytReady, currentGenre]);

  // Handle local audio for non-YouTube genres
  useEffect(() => {
    if (currentGenre === "burmese-lofi") return; // Skip for YouTube

    // Create audio element
    if (!audioRef.current) {
      audioRef.current = new Audio(getTrackPath(currentGenre, currentTrack));
      audioRef.current.volume = 0.3;
    }

    // Update audio source when track or genre changes
    audioRef.current.src = getTrackPath(currentGenre, currentTrack);

    // Auto-play next track when current ends
    const handleEnded = () => {
      setCurrentTrack((prev) => (prev + 1) % currentPlaylist.length);
    };

    audioRef.current.addEventListener("ended", handleEnded);

    if (isPlaying) {
      audioRef.current.play().catch(() => { });
    }

    return () => {
      if (audioRef.current) {
        audioRef.current.removeEventListener("ended", handleEnded);
      }
    };
  }, [currentTrack, currentGenre, currentPlaylist.length, isPlaying]);

  const switchGenre = (genre: MusicGenre) => {
    if (genre === currentGenre) return;

    // Stop current playback
    if (currentGenre === "burmese-lofi" && ytPlayerRef.current) {
      ytPlayerRef.current.pauseVideo();
    } else if (audioRef.current) {
      audioRef.current.pause();
    }

    setIsPlaying(false);
    setCurrentGenre(genre);
    if (genre !== "burmese-lofi") {
      setCurrentTrack(0); // Reset to first track for local genres
    }
    playDoubleClickSound();
  };

  // Get the icon path for current genre
  const getGenreIcon = (genre: MusicGenre) => {
    if (genre === "burmese-lofi") return "/UI/youtube.png";
    return genre === "chill" ? "/UI/ambient.png" : "/UI/jazz.png";
  };

  // Button component matching top menu style
  const MenuButton = ({
    onClick,
    title,
    imgSrc,
    active = false,
    size = 48,
  }: {
    onClick: () => void;
    title: string;
    imgSrc: string;
    active?: boolean;
    size?: number;
  }) => (
    <button
      onClick={onClick}
      title={title}
      style={{
        background: active ? GRAY_COLORS.bgActive : GRAY_COLORS.bg,
        border: "2px solid",
        borderColor: active
          ? `${GRAY_COLORS.borderDark} ${GRAY_COLORS.borderLight} ${GRAY_COLORS.borderLight} ${GRAY_COLORS.borderDark}` // Inverted for active
          : `${GRAY_COLORS.borderLight} ${GRAY_COLORS.borderDark} ${GRAY_COLORS.borderDark} ${GRAY_COLORS.borderLight}`, // Normal
        padding: 0,
        cursor: "pointer",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        borderRadius: 0,
        borderTop: "none",
        boxShadow: active ? `inset 1px 1px 0px ${GRAY_COLORS.shadow}` : `1px 1px 0px ${GRAY_COLORS.shadow}`,
        imageRendering: "pixelated",
        transition: "filter 0.1s",
        transform: active ? "translate(1px, 1px)" : "none",
      }}
      onMouseEnter={(e) => !active && (e.currentTarget.style.filter = "brightness(1.1)")}
      onMouseLeave={(e) => !active && (e.currentTarget.style.filter = "none")}
      onMouseDown={(e) => {
        if (active) return;
        e.currentTarget.style.filter = "brightness(0.9)";
        e.currentTarget.style.borderColor = `${GRAY_COLORS.borderDark} ${GRAY_COLORS.borderLight} ${GRAY_COLORS.borderLight} ${GRAY_COLORS.borderDark}`;
        e.currentTarget.style.transform = "translate(1px, 1px)";
        e.currentTarget.style.boxShadow = `inset 1px 1px 0px ${GRAY_COLORS.shadow}`;
      }}
      onMouseUp={(e) => {
        if (active) return;
        e.currentTarget.style.filter = "brightness(1.1)";
        e.currentTarget.style.borderColor = `${GRAY_COLORS.borderLight} ${GRAY_COLORS.borderDark} ${GRAY_COLORS.borderDark} ${GRAY_COLORS.borderLight}`;
        e.currentTarget.style.transform = "none";
        e.currentTarget.style.boxShadow = `1px 1px 0px ${GRAY_COLORS.shadow}`;
      }}
    >
      <img
        src={imgSrc}
        alt={title}
        style={{
          width: size,
          height: size,
          display: "block",
        }}
      />
    </button>
  );

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 0,
        borderTop: `2px solid ${GRAY_COLORS.borderLight}`,
        boxShadow: `inset 0 2px 0px ${GRAY_COLORS.borderLight}`,
      }}
      onWheel={(e) => e.stopPropagation()}
    >
      {/* Hidden YouTube player */}
      <div
        id="youtube-player"
        ref={ytContainerRef}
        style={{
          position: "absolute",
          width: 1,
          height: 1,
          opacity: 0,
          pointerEvents: "none",
          overflow: "hidden",
        }}
      />
      {/* Genre selector button */}
      <div style={{ position: "relative", display: "inline-block" }}>
        <MenuButton
          onClick={() => { }}
          title="Select Music Genre"
          imgSrc={getGenreIcon(currentGenre)}
        />
        <select
          value={currentGenre}
          onChange={(e) => switchGenre(e.target.value as MusicGenre)}
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            opacity: 0,
            cursor: "pointer",
            fontSize: 16,
          }}
        >
          <option value="chill">Chill</option>
          <option value="jazz">Jazz</option>
          <option value="burmese-lofi">Burmese Lofi</option>
        </select>
      </div>

      {/* Playback controls */}
      <MenuButton
        onClick={prevTrack}
        title="Previous Song"
        imgSrc="/UI/lastsong.png"
      />
      <MenuButton
        onClick={togglePlay}
        title={isPlaying ? "Pause" : "Play"}
        imgSrc={isPlaying ? "/UI/pause.png" : "/UI/play.png"}
        active={isPlaying}
      />
      <MenuButton
        onClick={nextTrack}
        title="Next Song"
        imgSrc="/UI/nextsong.png"
      />

      {/* Song name display with marquee */}
      <div
        style={{
          background: GRAY_COLORS.bg,
          border: "2px solid",
          borderColor: `${GRAY_COLORS.borderLight} ${GRAY_COLORS.borderDark} ${GRAY_COLORS.borderDark} ${GRAY_COLORS.borderLight}`,
          borderTop: "none",
          padding: "4px",
          minWidth: 180,
          maxWidth: 220,
          height: 48,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          boxShadow: `1px 1px 0px ${GRAY_COLORS.shadow}`,
          overflow: "hidden",
        }}
      >
        {/* Inner inset panel - dark gray/black */}
        <div
          style={{
            width: "100%",
            height: "100%",
            padding: "4px 8px",
            display: "flex",
            alignItems: "center",
            overflow: "hidden",
            position: "relative",
            background: "#000000", // Pure black background
            border: "1px solid",
            borderColor: `${GRAY_COLORS.shadow} ${GRAY_COLORS.borderDark} ${GRAY_COLORS.borderDark} ${GRAY_COLORS.shadow}`,
          }}
        >
          <div
            key={`${currentGenre}-${currentTrack}`}
            style={{
              color: isPlaying ? "#00ff00" : "#00cc00", // Green text - bright when playing, darker when paused
              fontSize: 18,
              fontWeight: "700",
              fontFamily: "var(--font-pixelify), monospace",
              whiteSpace: "nowrap",
              textShadow: "2px 2px 0 rgba(0, 0, 0, 0.9)",
              animation: "marquee 10s linear infinite",
              display: "inline-block",
              paddingLeft: "100%",
              letterSpacing: "1px",
              textTransform: "uppercase",
            }}
          >
            {currentGenre === "burmese-lofi"
              ? "BURMESE LOFI VOL 1-4 • BURMESE LOFI VOL 1-4"
              : `${currentTrack + 1}. ${currentGenre}_${currentPlaylist[currentTrack]}`.toUpperCase() + " • " + `${currentTrack + 1}. ${currentGenre}_${currentPlaylist[currentTrack]}`.toUpperCase()
            }
          </div>
        </div>
      </div>
    </div>
  );
}



