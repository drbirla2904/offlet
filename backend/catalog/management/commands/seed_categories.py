from django.core.management.base import BaseCommand, CommandError

from catalog.models import Category

# Two-level hierarchy: a business picks a top-level GROUP at registration
# (Business.category); offers/products then only offer that group's
# sub-categories (see catalog/views.py CategoryViewSet and
# offers/serializers.py ProductSerializer/OfferWriteSerializer validation).
# Every leaf name here matches section 20 of the product spec exactly —
# this only adds a grouping layer on top, nothing is renamed or removed.
# A group with a single, generic leaf (Automobile, Services) still gets one
# so "pick a business category" and "pick a product category" stay two
# separate, consistent steps everywhere — see the "no children" fallback
# in CategoryViewSet.for_business instead of special-casing it here.
GROUPS = {
    "Fashion & Apparel": ["Men's Fashion", "Women's Fashion", "Kids", "Footwear"],
    # Group name deliberately differs from the "Electronics" leaf below —
    # Category.name is unique, so a group can never share its exact name
    # with one of its own children (the Command.handle() below asserts
    # this on every run so the mistake can't silently reintroduce itself).
    "Electronics & Mobile": ["Electronics", "Mobile Accessories"],
    "Grocery & Food": ["Grocery", "Restaurant"],
    "Beauty & Wellness": ["Beauty", "Salon"],
    "Home & Living": ["Furniture", "Home & Kitchen"],
    "Sports & Books": ["Sports", "Books"],
    "Automobile": ["Vehicle Accessories", "Automobile Services"],
    "Services": ["Local Services", "Local Businesses"],
}


class Command(BaseCommand):
    help = "Seed the category groups + sub-categories (section 20 of the product spec)."

    def handle(self, *args, **options):
        # Category.name is globally unique — a group can never share its
        # exact name with one of its own (or any) children, or get_or_create
        # will silently collide the two rows into one. Fail loudly instead.
        all_children = [name for children in GROUPS.values() for name in children]
        colliding = set(GROUPS.keys()) & set(all_children)
        if colliding:
            raise CommandError(f"Group name(s) collide with a leaf category name: {colliding}")

        created = 0
        group_order = 0
        for group_name, children in GROUPS.items():
            group, was_created = Category.objects.get_or_create(
                name=group_name, defaults={"order": group_order, "parent": None}
            )
            if group.parent_id is not None:
                group.parent = None
                group.save(update_fields=["parent"])
            created += int(was_created)
            group_order += 1

            for i, child_name in enumerate(children):
                child, child_created = Category.objects.get_or_create(
                    name=child_name, defaults={"order": i, "parent": group}
                )
                if child.parent_id != group.id:
                    child.parent = group
                    child.save(update_fields=["parent"])
                created += int(child_created)

        total = sum(len(c) for c in GROUPS.values()) + len(GROUPS)
        self.stdout.write(self.style.SUCCESS(f"Seeded categories ({created} created/updated, {total} total)."))
