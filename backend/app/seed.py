"""
سكربت إنشاء المستخدمين الافتراضيين
python -m app.seed
"""
import asyncio
from sqlalchemy import select
from app.core.database import async_session
from app.core.security import hash_password
from app.models.user import User, UserRole


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


if __name__ == "__main__":
    asyncio.run(seed())
