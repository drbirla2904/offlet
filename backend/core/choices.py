class UserRole:
    CUSTOMER = "customer"
    SHOPKEEPER = "shopkeeper"
    ADMIN = "admin"
    CHOICES = [
        (CUSTOMER, "Customer"),
        (SHOPKEEPER, "Shopkeeper"),
        (ADMIN, "Admin"),
    ]


class BusinessType:
    SHOP = "shop"
    SERVICE = "service"
    RESTAURANT = "restaurant"
    RETAIL = "retail"
    OTHER = "other"
    CHOICES = [
        (SHOP, "Physical Shop"),
        (SERVICE, "Service Business"),
        (RESTAURANT, "Restaurant"),
        (RETAIL, "Retail Store"),
        (OTHER, "Other"),
    ]


class VerificationStatus:
    UNVERIFIED = "unverified"
    PENDING = "pending"
    VERIFIED = "verified"
    REJECTED = "rejected"
    SUSPENDED = "suspended"
    CHOICES = [
        (UNVERIFIED, "Unverified"),
        (PENDING, "Pending Review"),
        (VERIFIED, "Verified"),
        (REJECTED, "Rejected"),
        (SUSPENDED, "Suspended"),
    ]


class OfferType:
    PERCENTAGE = "percentage"
    FIXED_PRICE = "fixed_price"
    BOGO = "bogo"
    BUY_X_GET_Y = "buy_x_get_y"
    CLEARANCE = "clearance"
    FLASH_SALE = "flash_sale"
    LIMITED_STOCK = "limited_stock"
    COMBO = "combo"
    FREE_ITEM = "free_item"
    CUSTOM = "custom"
    CHOICES = [
        (PERCENTAGE, "Percentage Discount"),
        (FIXED_PRICE, "Fixed Price"),
        (BOGO, "Buy 1 Get 1"),
        (BUY_X_GET_Y, "Buy X Get Y"),
        (CLEARANCE, "Clearance Sale"),
        (FLASH_SALE, "Flash Sale"),
        (LIMITED_STOCK, "Limited Stock"),
        (COMBO, "Combo Offer"),
        (FREE_ITEM, "Free Item"),
        (CUSTOM, "Custom Offer"),
    ]


class OfferStatus:
    DRAFT = "draft"
    SCHEDULED = "scheduled"
    ACTIVE = "active"
    PAUSED = "paused"
    EXPIRED = "expired"
    SOLD_OUT = "sold_out"
    CHOICES = [
        (DRAFT, "Draft"),
        (SCHEDULED, "Scheduled"),
        (ACTIVE, "Active"),
        (PAUSED, "Paused"),
        (EXPIRED, "Expired"),
        (SOLD_OUT, "Sold Out"),
    ]


class OfferTag:
    DEMO = "demo"
    HOT_DEAL = "hot_deal"
    FLASH_SALE = "flash_sale"
    LIMITED_STOCK = "limited_stock"
    CLEARANCE = "clearance"
    BEST_SELLER = "best_seller"
    NEW = "new"
    POPULAR = "popular"
    TODAYS_DEAL = "todays_deal"
    PRICE_DROP = "price_drop"
    LAST_PIECES = "last_pieces"
    EXCLUSIVE = "exclusive"
    VERIFIED_SHOP = "verified_shop"
    CHOICES = [
        (DEMO, "Demo"),
        (HOT_DEAL, "Hot Deal"),
        (FLASH_SALE, "Flash Sale"),
        (LIMITED_STOCK, "Limited Stock"),
        (CLEARANCE, "Clearance"),
        (BEST_SELLER, "Best Seller"),
        (NEW, "New"),
        (POPULAR, "Popular"),
        (TODAYS_DEAL, "Today's Deal"),
        (PRICE_DROP, "Price Drop"),
        (LAST_PIECES, "Last Pieces"),
        (EXCLUSIVE, "Exclusive"),
        (VERIFIED_SHOP, "Verified Shop"),
    ]


class InteractionType:
    VIEW = "view"
    CALL = "call"
    WHATSAPP = "whatsapp"
    DIRECTIONS = "directions"
    SHARE = "share"
    FAVORITE = "favorite"
    CHAT = "chat"
    REPORT = "report"
    CHOICES = [
        (VIEW, "View"),
        (CALL, "Call"),
        (WHATSAPP, "WhatsApp"),
        (DIRECTIONS, "Directions"),
        (SHARE, "Share"),
        (FAVORITE, "Favorite"),
        (CHAT, "Chat"),
        (REPORT, "Report"),
    ]


class ReportReason:
    FAKE = "fake"
    WRONG_PRICE = "wrong_price"
    UNAVAILABLE = "unavailable"
    MISLEADING = "misleading"
    EXPIRED = "expired"
    CLOSED = "closed"
    OTHER = "other"
    CHOICES = [
        (FAKE, "Fake offer"),
        (WRONG_PRICE, "Wrong price"),
        (UNAVAILABLE, "Product unavailable"),
        (MISLEADING, "Misleading information"),
        (EXPIRED, "Expired offer"),
        (CLOSED, "Business closed"),
        (OTHER, "Other"),
    ]
