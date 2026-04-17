import { redirect } from "next/navigation";

// /mypage へのアクセスは /profile にリダイレクト（旧 URL 救済）
export default function MyPageRedirect() {
  redirect("/profile");
}
