import WishlistList from "@/components/wishlist/wishlist-list";
import { createClient } from "@/lib/supabase/server";
import { Metadata } from "next";
import { redirect } from "next/navigation";
import { getLang } from "@/lib/i18n/lang";
import { translate } from "@/lib/i18n/dict";

export async function generateMetadata(): Promise<Metadata> {
  const lang = await getLang();
  return {
    title: translate(lang, "wishlist.accountTitle"),
    description: translate(lang, "wishlist.accountDesc"),
  };
}

export default async function AccountWishlistPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?next=/account/wishlist");
  }

  const lang = await getLang();
  return (
    <WishlistList
      userId={user.id}
      title={translate(lang, "wishlist.accountTitle")}
      description={translate(lang, "wishlist.accountDesc")}
    />
  );
}
