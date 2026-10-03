import {
  ShoppingCart,
  Receipt,
  Car,
  GraduationCap,
  Activity,
  Zap,
  Wifi,
  Film,
  BookHeart,
  Package,
  TrendingDown,
  TrendingUp,
  type LucideIcon
} from "lucide-react";

export type CategoryConfig = {
  bg: string;
  text: string;
  icon: LucideIcon;
};

export const categoryColorMap: Record<string, CategoryConfig> = {
  "খাদ্য ও বাজার": { bg: "#FEE2E2", text: "#EF4444", icon: ShoppingCart }, // coral/red
  "শপিং": { bg: "#DCFCE7", text: "#22C55E", icon: ShoppingCart }, // green
  "খাবার": { bg: "#FEE2E2", text: "#EF4444", icon: ShoppingCart }, // red
  "বাজার": { bg: "#F3E8FF", text: "#A855F7", icon: ShoppingCart }, // purple
  "বাড়ি ভাড়া": { bg: "#E0F2FE", text: "#0EA5E9", icon: Receipt }, // sky
  "বাড়ি ভাড়া": { bg: "#E0F2FE", text: "#0EA5E9", icon: Receipt }, // sky
  "যাতায়াত": { bg: "#FFEDD5", text: "#F97316", icon: Car }, // orange
  "যাতায়াত": { bg: "#FFEDD5", text: "#F97316", icon: Car }, // orange
  "বাস ভাড়া": { bg: "#FFEDD5", text: "#F97316", icon: Car }, // orange
  "শিক্ষা": { bg: "#E0E7FF", text: "#6366F1", icon: GraduationCap }, // indigo
  "মাদরাসা ফি": { bg: "#E0E7FF", text: "#6366F1", icon: GraduationCap }, // indigo
  "চিকিৎসা": { bg: "#DBEAFE", text: "#3B82F6", icon: Activity }, // blue
  "ডাক্তারের ফি": { bg: "#DBEAFE", text: "#3B82F6", icon: Activity }, // blue
  "ওষুধ": { bg: "#DBEAFE", text: "#3B82F6", icon: Activity }, // blue
  "বিদ্যুৎ, গ্যাস, পানি": { bg: "#CFFAFE", text: "#06B6D4", icon: Zap }, // cyan
  "বিদ্যুৎ বিল": { bg: "#CFFAFE", text: "#06B6D4", icon: Zap }, // cyan
  "মোবাইল ও ইন্টারনেট": { bg: "#F3E8FF", text: "#A855F7", icon: Wifi }, // purple
  "ইন্টারনেট বিল": { bg: "#F3E8FF", text: "#A855F7", icon: Wifi }, // purple
  "বিনোদন": { bg: "#FCE7F3", text: "#EC4899", icon: Film }, // pink
  "উপহার": { bg: "#FCE7F3", text: "#EC4899", icon: BookHeart }, // pink
  "ধর্মীয় খরচ": { bg: "#FEF3C7", text: "#F59E0B", icon: BookHeart }, // amber
  "ধর্মীয় বই": { bg: "#FEF3C7", text: "#F59E0B", icon: BookHeart }, // amber
  "বিল": { bg: "#E0F2FE", text: "#0EA5E9", icon: Receipt }, // sky
  "অন্যান্য": { bg: "#E0E7FF", text: "#818CF8", icon: Package }, // soft indigo
  "অন্যান্য খরচ": { bg: "#E0E7FF", text: "#818CF8", icon: Package }, // soft indigo
};

export const defaultExpenseCategory: CategoryConfig = {
  bg: "#E0E7FF", text: "#818CF8", icon: TrendingDown
};

export const defaultIncomeCategory: CategoryConfig = {
  bg: "#DCFCE7", text: "#22C55E", icon: TrendingUp
};

export const getCategoryConfig = (name: string, type: "income" | "expense" = "expense"): CategoryConfig => {
  if (categoryColorMap[name]) {
    return categoryColorMap[name];
  }
  
  // Try to match by substring for robustness
  const lowerName = name.toLowerCase();
  for (const [key, config] of Object.entries(categoryColorMap)) {
    if (lowerName.includes(key)) {
      return config;
    }
  }

  return type === "income" ? defaultIncomeCategory : defaultExpenseCategory;
};
