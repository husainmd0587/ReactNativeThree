# CMakeLists.txt 
cmake_minimum_required(VERSION 3.18)

project(native_test LANGUAGES CXX)

# ─────────────────────────────────────────────────────────────────────────────
# C++ Standard
# ─────────────────────────────────────────────────────────────────────────────
set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)
set(CMAKE_CXX_EXTENSIONS OFF)

# Improve binary size + performance
set(CMAKE_CXX_FLAGS "${CMAKE_CXX_FLAGS} -O3 -fvisibility=hidden -fPIC")

# ─────────────────────────────────────────────────────────────────────────────
# Disable ALL optional Manifold features (must be BEFORE add_subdirectory)
# ─────────────────────────────────────────────────────────────────────────────
set(MANIFOLD_TEST          OFF CACHE BOOL "" FORCE)
set(BUILD_TESTING          OFF CACHE BOOL "" FORCE)
set(MANIFOLD_CROSS_SECTION OFF CACHE BOOL "" FORCE)
set(MANIFOLD_DEBUG         OFF CACHE BOOL "" FORCE)
set(MANIFOLD_PAR           OFF CACHE BOOL "" FORCE)
set(MANIFOLD_DOWNLOADS     OFF CACHE BOOL "" FORCE)
set(MANIFOLD_SAMPLES       OFF CACHE BOOL "" FORCE)
set(MANIFOLD_EXPORT        OFF CACHE BOOL "" FORCE)
set(MANIFOLD_CBIND         OFF CACHE BOOL "" FORCE)
set(MANIFOLD_PYBIND        OFF CACHE BOOL "" FORCE)

# ─────────────────────────────────────────────────────────────────────────────
# Add Manifold (local submodule)
# ─────────────────────────────────────────────────────────────────────────────
# Build manifold as STATIC (important!)
set(BUILD_SHARED_LIBS OFF CACHE BOOL "" FORCE)

add_subdirectory(manifold)


# ─────────────────────────────────────────────────────────────────────────────
# Our Native Library
# ─────────────────────────────────────────────────────────────────────────────
add_library(
    native-lib
    SHARED
    native-lib.cpp
)

# ─────────────────────────────────────────────────────────────────────────────
# Include Directories
# ─────────────────────────────────────────────────────────────────────────────
target_include_directories(native-lib PRIVATE
    ${CMAKE_CURRENT_SOURCE_DIR}/manifold/include
)

# ─────────────────────────────────────────────────────────────────────────────
# Android System Libraries
# ─────────────────────────────────────────────────────────────────────────────
find_library(log-lib log)

# ─────────────────────────────────────────────────────────────────────────────
# Link Libraries
# ─────────────────────────────────────────────────────────────────────────────
target_link_libraries(
    native-lib
    PRIVATE
    manifold
    ${log-lib}
)
