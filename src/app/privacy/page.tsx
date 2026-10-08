import {
  ExternalLink,
  LegalDocument,
  LegalItemList,
  LegalNumberedList,
  LegalSection,
} from "@/components/common/legal-document";
import { EXTERNAL_LINKS } from "@/lib/constants/external-links";
import { OPERATOR } from "@/lib/constants/operator";

export default function PrivacyPolicy() {
  return (
    <LegalDocument
      title="プライバシーポリシー"
      updatedAt="2026年9月29日"
      lead={
        <>
          <p className="mb-3">運営者：{OPERATOR.name}</p>
          <p>
            {OPERATOR.name}
            （以下「当団体」）は、「浜通りクエスト」（以下「本サービス」）において取得する個人情報を、次のとおり取り扱います。
          </p>
        </>
      }
    >
      <LegalSection heading="1. 取得する情報">
        <ul className="list-disc pl-6 space-y-2">
          <li>
            LINEログインにより取得する情報：LINEの表示名、プロフィール画像、LINEのユーザー識別子
          </li>
          <li>
            ニックネーム：ユーザーが登録した表示名（他のユーザーに公開されます）
          </li>
          <li>
            ミッションの達成記録：達成したミッション、達成日時、獲得ポイント
          </li>
          <li>
            チェックイン時の位置情報：現地にいることの確認のために取得する、端末の位置情報
          </li>
          <li>アクセスログ：IPアドレス、ブラウザ情報、Cookie情報等</li>
        </ul>
      </LegalSection>

      <LegalSection heading="2. 取得しない情報">
        <p>
          本サービスでは、氏名、住所、電話番号、メールアドレス、生年月日、クレジットカード情報などは取得しません。
        </p>
        <p>
          景品の応募に必要な氏名や住所などは、当団体とは別の事業者が運営する外部の応募フォームで取り扱われます。当団体は、応募フォームに入力された情報を取得せず、本サービスの利用履歴（ミッションの達成記録や位置情報）と突き合わせることも行いません。外部の応募フォームにおける取り扱いは、当該フォームの案内をご確認ください。
        </p>
      </LegalSection>

      <LegalSection heading="3. 利用目的">
        <LegalItemList
          items={[
            "本サービスの提供・運営",
            "ユーザーの認証およびログインの管理",
            "ポイントの集計と表示、ミッションの達成状況の管理",
            "チェックインが対象の場所で行われたことの確認、および不正の防止",
            "本サービスに関するお知らせの配信",
            "本サービスの利用状況の分析と改善、および実証実験の検証（周遊の状況や再訪の傾向の把握）。分析にあたっては個々の利用履歴を用いますが、分析の結果を公表したり第三者に提供したりする場合は、個人を特定できない集計した形に限ります。",
            "法令に基づく対応",
          ]}
        />
      </LegalSection>

      <LegalSection heading="4. 位置情報の取り扱い">
        <LegalNumberedList
          items={[
            "位置情報は、ユーザーがチェックインの操作を行ったときにのみ取得します。本サービスは、バックグラウンドで位置情報を継続的に取得することはありません。",
            "取得した位置情報は、チェックインの判定、不正の防止、および前項(6)の検証のために保存します。",
            "端末の設定により位置情報の取得を拒否できます。その場合、チェックインによるミッションの達成はできません。",
          ]}
        />
      </LegalSection>

      <LegalSection heading="5. 第三者への提供">
        <p>次の場合を除き、取得した情報を第三者に提供しません。</p>
        <LegalItemList
          items={[
            "ユーザー本人の同意がある場合",
            "法令に基づく場合",
            "人の生命、身体または財産の保護のために必要で、本人の同意を得ることが困難な場合",
            "国の機関等に協力する必要があり、本人の同意を得ることで当該事務の遂行に支障を及ぼすおそれがある場合",
          ]}
        />
      </LegalSection>

      <LegalSection heading="6. 業務委託">
        <p>
          当団体は、本サービスの開発・運営に必要な範囲で、取得した情報の取り扱いを外部の事業者に委託することがあります。委託先に対しては、適切な取り扱いが行われるよう必要かつ適切な監督を行います。
        </p>
      </LegalSection>

      <LegalSection heading="7. 情報の管理と保存期間">
        <LegalNumberedList
          items={[
            "当団体は、取得した情報の漏えい、滅失、き損の防止のために必要な措置を講じます。",
            "本サービスを含む事業は、2026年12月末までを予定しています。事業の終了後、本サービスを継続しないことが決まった場合、取得した情報は3か月以内に削除します。継続する場合は、あらためて本サービス上でお知らせします。",
            "ユーザーが退会した場合、当該ユーザーのアカウント情報および達成記録を削除します。",
          ]}
        />
      </LegalSection>

      <LegalSection heading="8. 開示・訂正・削除のご請求">
        <p>
          ご自身の情報の開示、訂正、利用停止、削除をご希望の場合は、下記のお問い合わせフォームからお申し出ください。ご本人からのお申し出であることを確認のうえ、対応します。
        </p>
      </LegalSection>

      <LegalSection heading="9. Cookie について">
        <p>
          本サービスは、ログイン状態の保持や利用状況の把握のために Cookie
          を使用します。ブラウザの設定により Cookie
          を無効にできますが、その場合、本サービスの一部の機能が利用できなくなることがあります。
        </p>
      </LegalSection>

      <LegalSection heading="10. 本ポリシーの変更">
        <p>
          当団体は、本ポリシーを変更することがあります。変更後のポリシーは、本サービス上に掲示した時点から効力を生じます。
        </p>
      </LegalSection>

      <LegalSection heading="11. お問い合わせ">
        <p>{OPERATOR.name}</p>
        <p>
          ご意見・お問い合わせフォーム：
          <ExternalLink href={EXTERNAL_LINKS.feedback_action_board} />
        </p>
      </LegalSection>
    </LegalDocument>
  );
}
