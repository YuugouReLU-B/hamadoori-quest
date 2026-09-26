interface OnboardingDialogue {
  id: number;
  text: string;
  isWelcome: boolean;
  showMissionCard?: boolean;
  showMissionDetails?: boolean;
}

export const onboardingDialogues: OnboardingDialogue[] = [
  {
    id: 1,
    text: "",
    isWelcome: true,
  },
  {
    id: 2,
    text: "ここは、浜通りクエスト。\n浜通りを面白がる者たちが集いし場所。\n\nわしは、この浜通りクエストの主、アクション仙人じゃ。",
    isWelcome: false,
  },
  {
    id: 3,
    text: "このアプリではの、イベント参加、地域の手伝い、まちの魅力の発信… あらゆる「浜通りとの関わり方」を、気軽に、楽しく、こなせるようになっとる。",
    isWelcome: false,
  },
  {
    id: 4,
    text: "何をすればええか分からん？心配いらん。ちょいとした気軽なアクションも揃えとるから、初めてでも心配いらんぞい。",
    isWelcome: false,
  },
  {
    id: 5,
    text: "ではさっそく、初めてのクエストじゃぞ。\nまずは、浜通りクエストの公式LINEと友だちになって、新しい知らせを受け取れるようにするんじゃ。",
    isWelcome: false,
  },
  {
    id: 6,
    text: "「浜通りクエストの公式LINEを友だち追加しよう」\n\nこのクエストでは、ボタンを押すだけで自動的にクエストクリアじゃ！\n\n下のボタンから挑戦してみるとええ！",
    isWelcome: false,
    showMissionDetails: true,
  },
  {
    id: 7,
    text: "うむ、上出来じゃ！\n\n実際のクエストでは、提出するとポイントがもらえるぞい。\nさあ、浜通りクエストへ踏み出すのじゃ！",
    isWelcome: false,
  },
];
