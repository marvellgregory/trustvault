import { redirect } from "next/navigation";

export default function WishlistPage() {
  redirect(
    "/coming-soon?feature=Wishlist",
  );
}
