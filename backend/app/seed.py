"""
سكربت إنشاء المستخدمين الافتراضيين
python -m app.seed
"""
import asyncio
from decimal import Decimal
from sqlalchemy import select
from app.core.database import async_session
from app.core.security import hash_password
from app.models.user import User, UserRole
from app.models.service import Service, ServiceCategory


DEFAULT_SERVICES = [
    {
        "name": "Lavage interieur et exterieur",
        "name_ar": "غسيل داخلي و خارجي",
        "description": "Lavage interieur et exterieur complet. Prix a partir de 25 TND.",
        "category": ServiceCategory.WASH,
        "price": Decimal("25.000"),
        "duration_minutes": 45,
        "aliases": ["Lavage intérieur et extérieur"],
    },
    {
        "name": "Nettoyant ceramique en spray",
        "name_ar": "غسيل سيراميك سبراي",
        "description": "Nettoyant ceramique en spray avec finition brillante. Prix 45 TND.",
        "category": ServiceCategory.CERAMIC,
        "price": Decimal("45.000"),
        "duration_minutes": 60,
        "aliases": ["Nettoyant céramique en spray"],
    },
    {
        "name": "Nettoyage a la vapeur en profondeur",
        "name_ar": "تنظيف عميق بالبوخار",
        "description": "Nettoyage a la vapeur en profondeur pour habitacle et surfaces. Prix a partir de 80 TND.",
        "category": ServiceCategory.INTERIOR,
        "price": Decimal("80.000"),
        "duration_minutes": 90,
        "aliases": ["Nettoyage à la vapeur en profondeur", "Nettoyage a la vapeur en profondeur"],
    },
    {
        "name": "Detailing",
        "name_ar": "تفصيل",
        "description": "Detailing complet pour une finition premium. Prix a partir de 100 TND.",
        "category": ServiceCategory.DETAILING,
        "price": Decimal("100.000"),
        "duration_minutes": 120,
        "aliases": ["detailing"],
    },
    {
        "name": "Polissage Lustrage",
        "name_ar": "ازالة خدوش",
        "description": "Polissage lustrage pour attenuer les rayures visibles. Prix a partir de 150 TND.",
        "category": ServiceCategory.POLISH,
        "price": Decimal("150.000"),
        "duration_minutes": 180,
    },
    {
        "name": "Elimination des rayures profondes",
        "name_ar": "ازالة خدوش عميقة عملية دقيقة",
        "description": "L'elimination des rayures profondes est un processus delicat. Prix 70 TND.",
        "category": ServiceCategory.POLISH,
        "price": Decimal("70.000"),
        "duration_minutes": 90,
        "aliases": [
            "L'élimination des rayures profondes est un processus délicat",
            "L'elimination des rayures profondes est un processus delicat",
        ],
    },
    {
        "name": "Nano Ceramic",
        "name_ar": "نانو سيراميك",
        "description": "Protection Nano Ceramic longue duree. Prix a partir de 450 TND.",
        "category": ServiceCategory.CERAMIC,
        "price": Decimal("450.000"),
        "duration_minutes": 240,
    },
]


async def seed_services(db):
    for item in DEFAULT_SERVICES:
        names_to_match = [item["name"], item["name_ar"], *(item.get("aliases") or [])]
        result = await db.execute(
            select(Service).where(
                Service.name.in_(names_to_match) | Service.name_ar.in_(names_to_match)
            )
        )
        existing = result.scalars().first()
        payload = {key: value for key, value in item.items() if key != "aliases"}
        if existing:
            existing.name = payload["name"]
            existing.name_ar = payload["name_ar"]
            existing.description = payload["description"]
            existing.category = payload["category"]
            existing.price = payload["price"]
            existing.duration_minutes = payload["duration_minutes"]
            existing.is_active = True
        else:
            db.add(Service(**payload, is_active=True))

    await db.commit()
    print(f"✅ Services synced: {len(DEFAULT_SERVICES)}")


async def seed():
    async with async_session() as db:
        # ──── Admin: Raafet ────
        result = await db.execute(select(User).where(User.role == UserRole.ADMIN))
        if result.scalar_one_or_none():
            print("✅ Admin already exists, skipping.")
        else:
            admin = User(
                full_name="Raafet",
                email="amilcarautocare@gmail.com",
                phone="21697038792",
                hashed_password=hash_password("admin123"),
                role=UserRole.ADMIN,
            )
            db.add(admin)
            await db.commit()
            print("✅ Admin created: Raafet — amilcarautocare@gmail.com / admin123")

        # ──── Worker: Mohamed ────
        result = await db.execute(
            select(User).where(User.full_name == "Mohamed", User.role == UserRole.WORKER)
        )
        if result.scalar_one_or_none():
            print("✅ Worker Mohamed already exists, skipping.")
        else:
            worker = User(
                full_name="Mohamed",
                email="mohamed@amilcar.tn",
                phone="00000001",
                hashed_password=hash_password("worker123"),
                role=UserRole.WORKER,
            )
            db.add(worker)
            await db.commit()
            print("✅ Worker created: Mohamed — mohamed@amilcar.tn / worker123")

        # ──── Client: Fathi Ghabri ────
        result = await db.execute(
            select(User).where(User.full_name == "Fathi Ghabri", User.role == UserRole.CLIENT)
        )
        if result.scalar_one_or_none():
            print("✅ Client Fathi Ghabri already exists, skipping.")
        else:
            client = User(
                full_name="Fathi Ghabri",
                email="fathi.ghabri@amilcar.tn",
                phone="00000002",
                hashed_password=hash_password("client123"),
                role=UserRole.CLIENT,
            )
            db.add(client)
            await db.commit()
            print("✅ Client created: Fathi Ghabri — fathi.ghabri@amilcar.tn / client123")

        await seed_services(db)


if __name__ == "__main__":
    asyncio.run(seed())
{"name":"AMILCAR Auto Care API","version":"1.0.0","status":"running ✅"}
